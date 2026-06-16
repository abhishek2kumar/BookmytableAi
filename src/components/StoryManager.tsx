import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Story, Restaurant } from '../types';
import { Loader2, Plus, X, Eye, Trash2, Image as ImageIcon, Video, Clock, Users } from 'lucide-react';
import { generateSeoFriendlyFileName } from '../lib/utils';

interface Props {
  restaurant: Restaurant;
}

export default function StoryManager({ restaurant }: Props) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mobileViewersStory, setMobileViewersStory] = useState<string | null>(null);

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

    const seoFileName = generateSeoFriendlyFileName(file.name, 'story', restaurant.name);
    const fileName = `stories/${seoFileName}`;
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
                <h3 className="text-[#363636] font-normal leading-[1.2]">Add New Story</h3>
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
            <h3 className="uppercase tracking-widest text-sm mb-4 text-[#363636] font-normal leading-[1.2]">Active Stories</h3>
            {activeStories.length === 0 ? (
                <div className="text-sm text-slate-500">No active stories.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {activeStories.map(story => (
                        <div key={story.id} className="bg-white border text-sm font-medium border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row relative group">
                            {/* Delete Button */}
                            <div className="absolute top-2 right-2 flex gap-2 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDelete(story)} className="p-2 bg-red-50/90 backdrop-blur-md text-red-500 rounded-[10px] hover:bg-red-100 shadow-sm border border-red-100">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Media Section */}
                            <div className="w-full md:w-64 shrink-0 aspect-[9/16] bg-slate-900 relative">
                                {story.mediaType === 'video' ? (
                                    <video src={story.mediaUrl} className="w-full h-full object-contain" muted loop autoPlay playsInline />
                                ) : (
                                    <img src={story.mediaUrl} className="w-full h-full object-contain" />
                                )}
                                
                                {/* Overlay info */}
                                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent pt-12">
                                     <button 
                                        type="button"
                                        onClick={() => setMobileViewersStory(mobileViewersStory === story.id ? null : story.id)}
                                        className="flex items-center gap-2 text-white/90 text-sm font-bold font-mono active:scale-95 transition-transform"
                                     >
                                        <Eye size={14} /> {Array.from(new Map((story.views || []).map(v => [v.userId, v])).values()).length} Views
                                        <span className="md:hidden opacity-70 ml-1 text-[10px]">(Tap to see)</span>
                                     </button>
                                </div>
                                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[11px] text-white font-bold flex items-center gap-1 pointer-events-none">
                                     <Clock size={12} /> {Math.max(0, Math.ceil((story.expiresAt - now) / (1000 * 60 * 60 * 24)))}d left
                                </div>
                            </div>

                            {/* Viewers Section */}
                            <div className={`flex-1 p-5 bg-white relative ${mobileViewersStory === story.id ? 'block absolute inset-0 z-10 bg-white/98 backdrop-blur-md' : 'hidden md:block'}`}>
                               <div className="absolute inset-0 overflow-y-auto px-5 py-5 scrollbar-hide">
                                 <div className="text-[11px] font-black uppercase tracking-widest text-[#363636] mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users size={14} className="text-slate-400" /> Viewers
                                    </div>
                                    <button 
                                        onClick={() => setMobileViewersStory(null)}
                                        className="md:hidden p-1.5 -mr-1.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
                                    >
                                        <X size={14} />
                                    </button>
                                 </div>
                                 
                                 {(!story.views || story.views.length === 0) ? (
                                     <div className="text-sm text-slate-500 italic mt-4 text-center">No viewers yet</div>
                                 ) : (
                                     <div className="space-y-4 pb-4">
                                        {Array.from(new Map((story.views || []).map(v => [v.userId, v])).values()).map((v: any, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                {v.userPhoto ? (
                                                    <img src={v.userPhoto} className="w-8 h-8 shrink-0 rounded-full border border-slate-200" />
                                                ) : (
                                                    <div className="w-8 h-8 shrink-0 rounded-full bg-brand/10 flex items-center justify-center text-xs font-bold text-brand border border-brand/20">
                                                        {v.userName.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="flex flex-col flex-1 overflow-hidden">
                                                    <span className="text-sm truncate font-bold text-slate-700 leading-tight">{v.userName}</span>
                                                    {v.viewedAt && (
                                                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                            {new Date(v.viewedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                 )}
                               </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}
