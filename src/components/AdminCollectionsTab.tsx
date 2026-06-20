import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useMasterData } from './MasterDataContext';

export default function AdminCollectionsTab() {
  const { diningCollections } = useMasterData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    slug: '',
    description: '',
    isActive: true,
    order: 0
  });

  const resetForm = () => {
    setFormData({ name: '', image: '', slug: '', description: '', isActive: true, order: 0 });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (c: any) => {
    setFormData({
      name: c.name,
      image: c.image || '',
      slug: c.slug || '',
      description: c.description || '',
      isActive: c.isActive !== false,
      order: c.order || 0
    });
    setEditingId(c.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        order: Number(formData.order) || 0,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'dining_collections', editingId), data);
      } else {
        await addDoc(collection(db, 'dining_collections'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (err) {
      console.error('Error saving collection:', err);
      alert('Failed to save collection');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this collection?')) {
      await deleteDoc(doc(db, 'dining_collections', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Dining Collections</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-xl shadow-md font-medium text-sm hover:bg-brand-dark transition-all"
        >
          <Plus size={16} /> Add Collection
        </button>
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => {
                   setFormData(prev => ({ 
                     ...prev, 
                     name: e.target.value,
                     slug: !editingId ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') : prev.slug
                   }));
                }}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand/30"
                placeholder="e.g. Perfect Date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand/30"
                placeholder="e.g. perfect-date"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
              <input
                type="url"
                required
                value={formData.image}
                onChange={e => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand/30"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand/30"
                placeholder="Find the best romantic spots..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Index</label>
              <input
                type="number"
                value={formData.order}
                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand/30"
              />
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-brand text-white font-medium hover:bg-brand-dark transition-all"
            >
              Save Collection
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {diningCollections.sort((a, b) => a.order - b.order).map(c => (
          <div key={c.id} className="bg-white border text-center border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="h-32 w-full bg-slate-100 relative">
              {c.image ? (
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ImageIcon size={32} />
                </div>
              )}
              {!c.isActive && (
                <div className="absolute top-2 right-2 bg-slate-800/80 text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded">
                  Inactive
                </div>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-bold text-lg text-slate-800">{c.name}</h4>
              {c.description && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{c.description}</p>}
              
              <div className="flex items-center justify-between mt-4">
                 <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Order: {c.order}</span>
                 <div className="flex gap-2">
                   <button
                     onClick={() => handleEdit(c)}
                     className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                   >
                     <Edit2 size={16} />
                   </button>
                   <button
                     onClick={() => handleDelete(c.id!)}
                     className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
              </div>
            </div>
          </div>
        ))}
        {diningCollections.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No collections found. Click "Add Collection" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
