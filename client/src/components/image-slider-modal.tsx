import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { X, Plus } from 'lucide-react';

interface SliderImage {
  id: string;
  src: string;
  caption: string;
  title: string;
  description: string;
}

interface ImageSliderModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (sliderHtml: string, images?: SliderImage[]) => void;
  editingImages?: { images: SliderImage[]; sliderId: string } | null;
}

export function ImageSliderModal({ open, onClose, onInsert, editingImages }: ImageSliderModalProps) {
  const [images, setImages] = useState<SliderImage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingImages) {
      setImages(editingImages.images);
      if (editingImages.images.length > 0) {
        setEditingId(editingImages.images[0].id);
      }
    }
  }, [editingImages]);

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: SliderImage = {
          id: Date.now().toString(),
          src: event.target?.result as string,
          caption: '',
          title: '',
          description: ''
        };
        setImages([...images, newImage]);
        setEditingId(newImage.id);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateImage = (id: string, field: string, value: string) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, [field]: value } : img
    ));
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const handleInsert = () => {
    if (images.length === 0) return;

    let slidesHtml = '';
    images.forEach((img, idx) => {
      slidesHtml += `<div class="slider-slide" data-index="${idx}" style="display: ${idx === 0 ? 'flex' : 'none'}; align-items: center; justify-content: center;">`;
      slidesHtml += `<img src="${img.src}" alt="${img.caption}" class="slider-image" data-title="${img.title}" data-description="${img.description}" style="max-width: 100%; height: auto; border-radius: 12px;"/>`;
      slidesHtml += '</div>';
    });

    let dotsHtml = '';
    images.forEach((_, idx) => {
      dotsHtml += `<span class="slider-dot" data-index="${idx}" style="display: inline-block; width: 8px; height: 8px; margin: 0 4px; background: ${idx === 0 ? '#333' : '#d1d5db'}; border-radius: 50%; cursor: pointer; transition: background 0.3s;"></span>`;
    });

    const showControls = images.length > 1;

    const sliderHtml = `<div class="image-slider" style="margin: 20px auto; position: relative; border-radius: 16px; overflow: hidden; background: transparent; padding: 0; max-width: 100%; user-select: none;">
      <div class="slider-container" style="position: relative; background: transparent; border-radius: 16px; overflow: hidden; aspect-ratio: 16/9;">
        ${slidesHtml}
        ${showControls ? `<button class="slider-prev" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.3); color: white; border: none; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; z-index: 10; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; backdrop-filter: blur(4px);" onmouseover="this.style.background='rgba(0,0,0,0.5)'" onmouseout="this.style.background='rgba(0,0,0,0.3)'">‹</button>` : ''}
        ${showControls ? `<button class="slider-next" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.3); color: white; border: none; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; z-index: 10; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; backdrop-filter: blur(4px);" onmouseover="this.style.background='rgba(0,0,0,0.5)'" onmouseout="this.style.background='rgba(0,0,0,0.3)'">›</button>` : ''}
      </div>
      ${showControls ? `<div class="slider-dots" style="text-align: center; padding: 12px; background: transparent;">
        ${dotsHtml}
      </div>` : ''}
      ${images[0]?.caption ? `<p class="slider-caption" style="text-align: center; margin-top: 8px; font-size: 14px; color: #666; font-weight: 500;">${images[0].caption}</p>` : ''}
    </div>`;

    onInsert(sliderHtml, images);
    resetModal();
  };

  const resetModal = () => {
    setImages([]);
    setEditingId(null);
    onClose();
  };

  const editingImage = images.find(img => img.id === editingId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetModal()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingImages ? 'Edit Image Slider' : 'Insert Image Slider'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Images ({images.length})</Label>
            <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No images added yet</p>
              ) : (
                <div className="space-y-2">
                  {images.map((img, idx) => (
                    <div key={img.id} className={`p-2 border rounded flex items-center justify-between cursor-pointer ${editingId === img.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-muted'}`} onClick={() => setEditingId(img.id)}>
                      <div className="flex items-center gap-2 flex-1">
                        <img src={img.src} alt="thumb" className="w-10 h-10 object-cover rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{img.title || `Image ${idx + 1}`}</p>
                          <p className="text-xs text-muted-foreground truncate">{img.caption}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={(e) => {e.stopPropagation(); removeImage(img.id);}} className="h-6 w-6 p-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Image
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAddImage} className="hidden" />

          {editingImage && (
            <div className="border border-border rounded-lg p-4 bg-blue-50">
              <h3 className="font-medium mb-3">Image Details</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="img-title">Title (for WordPress)</Label>
                  <Input id="img-title" placeholder="Image title" value={editingImage.title} onChange={(e) => updateImage(editingImage.id, 'title', e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label htmlFor="img-caption">Caption (visible in article)</Label>
                  <Input id="img-caption" placeholder="Image caption" value={editingImage.caption} onChange={(e) => updateImage(editingImage.id, 'caption', e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label htmlFor="img-desc">Description (for WordPress)</Label>
                  <Textarea id="img-desc" placeholder="Image description" value={editingImage.description} onChange={(e) => updateImage(editingImage.id, 'description', e.target.value)} className="text-sm min-h-20" />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetModal}>Cancel</Button>
          <Button onClick={handleInsert} disabled={images.length === 0}>{editingImages ? 'Update Slider' : 'Insert Slider'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
