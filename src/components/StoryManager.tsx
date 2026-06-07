import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Story, Restaurant } from '../types';
import { Loader2, Plus, X, Eye, Trash2, Image as ImageIcon, Video, Clock } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
}

export default function StoryManager({ restaurant }: Props) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!restaurant?.id) return;
    const q = query(collection(db, 'stories'), where('restaurantId', '==', restaurant.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Story[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Story);
      });
      // Sort locally to avoid composite index requirement
      data.sort((a, b) => {
         const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
         const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
         return timeB - timeA; // desc
      });
      setStories(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching stories:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurant]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert("Only images and videos are supported.");
        return;
    }

    const isVideo = file.type.startsWith('video/');

    if (file.size > 20 * 1024 * 1024) {
      alert("File size should be less than 20MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    const ext = file.name.split('.').pop();
    const fileName = `stories/${restaurant.id}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(prog);
      },
      (error) => {
        console.error("Upload failed", error);
        alert("Failed to upload media.");
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Save to Firestore
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        try {
          await addDoc(collection(db, 'stories'), {
              restaurantId: restaurant.id,
              restaurantName: restaurant.name || '',
              restaurantImage: restaurant.image || '',
              city: restaurant.city || '',
              mediaUrl: downloadURL || '',
              mediaType: isVideo ? 'video' : 'image',
              createdAt: serverTimestamp(),
              expiresAt: expiresAt.getTime(),
              views: []
          });
        } catch (err: any) {
          console.error("Firestore addDoc error:", err);
          alert("Error adding story: " + err.message);
        }

        setUploading(false);
        setProgress(0);
      }
    );
  };

  useEffect(() => {
    // Auto-delete expired stories
    if (stories.length === 0) return;
    const now = Date.now();
    const expired = stories.filter(s => s.expiresAt <= now);
    if (expired.length > 0) {
      expired.forEach(async (story) => {
        try {
            await deleteDoc(doc(db, 'stories', story.id));
            if (story.mediaUrl.includes('firebasestorage')) {
                 const storageRef = ref(storage, story.mediaUrl);
                 await deleteObject(storageRef).catch(console.error);
            }
        } catch (err) {
            console.error("Failed to auto-delete story:", err);
        }
      });
    }
  }, [stories]);

  const handleDelete = async (story: Story) => {
    if (!window.confirm("Delete this story?")) return;
    try {
        await deleteDoc(doc(db, 'stories', story.id));
        if (story.mediaUrl.includes('firebasestorage')) {
             const storageRef = ref(storage, story.mediaUrl);
             await deleteObject(storageRef).catch(console.error);
        }
    } catch (err) {
        console.error("Failed to delete story:", err);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  const now = Date.now();
  const activeStories = stories.filter(s => s.expiresAt > now);
  const expiredStories = stories.filter(s => s.expiresAt <= now);

  return (
    <div className="space-y-8 animate-in fade-in">
        {/* Upload Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center">
                <Plus size={24} />
            </div>
            <div>
                <h3 className="font-bold text-slate-900">Add New Story</h3>
                <p className="text-sm text-slate-500">Share images or videos (up to 20MB) with your followers. Disappears in 7 days.</p>
            </div>
            {uploading ? (
                 <div className="w-full max-w-sm">
                     <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
                     </div>
                     <span className="text-xs font-bold text-slate-500 mt-2 block">Uploading... {Math.round(progress)}%</span>
                 </div>
            ) : (
                <label className="bg-brand text-white px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-brand/90 transition-colors">
                    Upload Media
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
                </label>
            )}
        </div>

        {/* Active Stories */}
        <div>
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm mb-4">Active Stories</h3>
            {activeStories.length === 0 ? (
                <div className="text-sm text-slate-500">No active stories.</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {activeStories.map(story => (
                        <div key={story.id} className="bg-white border text-sm font-medium border-slate-300 rounded-2xl overflow-hidden relative group">
                            <div className="absolute top-2 right-2 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDelete(story)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="aspect-[9/16] bg-slate-100 relative">
                                {story.mediaType === 'video' ? (
                                    <video src={story.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                ) : (
                                    <img src={story.mediaUrl} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pt-12">
                                     <div className="flex items-center gap-1.5 text-white/90 text-xs font-bold font-mono">
                                        <Eye size={12} /> {Array.from(new Map((story.views || []).map(v => [v.userId, v])).values()).length}
                                     </div>
                                </div>
                                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] text-white font-bold flex items-center gap-1">
                                     <Clock size={10} /> {Math.max(0, Math.ceil((story.expiresAt - now) / (1000 * 60 * 60 * 24)))}d left
                                </div>
                            </div>
                            {story.views && story.views.length > 0 && (
                                <div className="p-3 bg-slate-50 border-t border-slate-200 max-h-32 overflow-y-auto">
                                   <div className="text-[10px] font-black uppercase text-slate-500 mb-2">Viewers</div>
                                   <div className="space-y-2">
                                      {Array.from(new Map((story.views || []).map(v => [v.userId, v])).values()).map((v: any, i) => (
                                          <div key={i} className="flex items-center gap-2">
                                              {v.userPhoto ? (
                                                  <img src={v.userPhoto} className="w-5 h-5 rounded-full" />
                                              ) : (
                                                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                      {v.userName.charAt(0)}
                                                  </div>
                                              )}
                                              <span className="text-xs truncate flex-1 leading-tight">{v.userName}</span>
                                          </div>
                                      ))}
                                   </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}
