import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Pencil, Trash2, X, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layout/Header';
import { getCannedResponses, createCannedResponse, updateCannedResponse, deleteCannedResponse } from '@/lib/api';
import type { CannedResponse } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function CannedResponses() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', category: '', is_active: true });

  const { data: responses, isLoading } = useQuery({
    queryKey: ['canned-responses', categoryFilter],
    queryFn: () => getCannedResponses(categoryFilter ? { category: categoryFilter } : {}),
  });

  const createMutation = useMutation({
    mutationFn: createCannedResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      setShowDialog(false);
      resetForm();
      toast.success('Canned response created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CannedResponse> }) => updateCannedResponse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      setShowDialog(false);
      setEditing(null);
      resetForm();
      toast.success('Canned response updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCannedResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      toast.success('Canned response deleted');
    },
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', category: '', is_active: true });
  };

  const handleNew = () => {
    setEditing(null);
    resetForm();
    setShowDialog(true);
  };

  const handleEdit = (response: CannedResponse) => {
    setEditing(response);
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category,
      is_active: response.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this canned response?')) {
      deleteMutation.mutate(id);
    }
  };

  const categories = [...new Set(responses?.map((r) => r.category).filter(Boolean) || [])];

  const filteredResponses = responses?.filter((r) => {
    const matchesSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-5">
      <Header />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search responses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9 h-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {categoryFilter && (
            <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('')} className="h-8 gap-1 text-slate-500">
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </div>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
          <Plus className="w-4 h-4" />
          Add Response
        </Button>
      </div>

      {/* Response Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredResponses?.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredResponses.map((response) => (
            <Card key={response.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-slate-800 truncate">{response.title}</h3>
                      {response.category && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium flex-shrink-0">
                          {response.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{response.content}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(response)}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(response.id)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No canned responses found</p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-3">
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editing ? 'Edit Canned Response' : 'New Canned Response'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Acknowledge Receipt"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Response text..."
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., General, Escalation, Technical"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                {editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
