import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Bold, Italic, List, Heading2, ImageIcon, Link, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Rows, Trash2, Edit2 } from 'lucide-react';
import { ImageSliderModal } from './image-slider-modal';

interface SimpleEditorProps {
  content: string;
  onChange: (content: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
}

export function SimpleEditor({ content, onChange, onEmptyChange }: SimpleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sliderModalOpen, setSliderModalOpen] = useState(false);
  const [selectedSlider, setSelectedSlider] = useState<HTMLElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingSliderImages, setEditingSliderImages] = useState<any>(null);

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = content || '';
      setHistory([content || '']);
      setHistoryIndex(0);
      setIsInitialized(true);
    }
  }, [isInitialized, content]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging || !selectedSlider || !editorRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const slider = selectedSlider as HTMLElement;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      slider.style.position = 'relative';
      slider.style.left = newX + 'px';
      slider.style.top = newY + 'px';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (editorRef.current) {
        updateContent(editorRef.current.innerHTML);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, selectedSlider]);

  const updateContent = (newContent: string) => {
    onChange(newContent);
    const isEmpty = !newContent || newContent === '' || newContent.replace(/<[^>]*>/g, '').trim() === '';
    onEmptyChange(isEmpty);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
      }
    }
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file && editorRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = `<img src="${event.target?.result}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" />`;
        document.execCommand('insertHTML', false, img);
        if (editorRef.current) {
          updateContent(editorRef.current.innerHTML);
        }
      };
      reader.readAsDataURL(file);
    }
    e.currentTarget.value = '';
  };

  const handleSliderInsert = (sliderHtml: string, images?: any) => {
    if (!editorRef.current) return;

    const sliderId = 'slider-' + Date.now();
    const wrappedSlider = sliderHtml.replace('class="image-slider"', `class="image-slider" data-slider-id="${sliderId}"`);
    
    editorRef.current.innerHTML += wrappedSlider;
    editorRef.current.focus();
    
    updateContent(editorRef.current.innerHTML);
    setSliderModalOpen(false);
    setEditingSliderImages(null);

    // Setup slider buttons
    setTimeout(() => {
      setupSliderButtons(sliderId);
    }, 100);
  };

  const setupSliderButtons = (sliderId: string) => {
    if (!editorRef.current) return;
    
    const slider = editorRef.current.querySelector(`[data-slider-id="${sliderId}"]`) as HTMLElement;
    if (!slider) return;

    const prevBtn = slider.querySelector('.slider-prev') as HTMLButtonElement;
    const nextBtn = slider.querySelector('.slider-next') as HTMLButtonElement;
    const dots = slider.querySelectorAll('.slider-dot') as NodeListOf<HTMLElement>;
    const slides = slider.querySelectorAll('.slider-slide') as NodeListOf<HTMLElement>;
    let currentIndex = 0;

    const showSlide = (index: number) => {
      slides.forEach((s, i) => {
        s.style.display = i === index ? 'flex' : 'none';
      });
      dots.forEach((d, i) => {
        d.style.background = i === index ? '#333' : '#d1d5db';
      });
    };

    if (prevBtn) {
      prevBtn.onclick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(currentIndex);
      };
    }

    if (nextBtn) {
      nextBtn.onclick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
      };
    }

    dots.forEach((dot, index) => {
      dot.onclick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = index;
        showSlide(currentIndex);
      };
    });
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.slider-prev') || target.closest('.slider-next') || target.closest('.slider-dot') || target.closest('img')) {
      return;
    }
    
    if (selectedSlider) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const editSlider = () => {
    if (!selectedSlider) return;
    
    const slides = selectedSlider.querySelectorAll('.slider-slide');
    const images: any = [];
    
    slides.forEach((slide, idx) => {
      const img = slide.querySelector('img') as HTMLImageElement;
      const caption = slide.querySelector('.slider-caption');
      if (img) {
        images.push({
          id: idx.toString(),
          src: img.src,
          title: img.getAttribute('data-title') || '',
          description: img.getAttribute('data-description') || '',
          caption: caption?.textContent || ''
        });
      }
    });

    setEditingSliderImages({ images, sliderId: selectedSlider.getAttribute('data-slider-id') });
    setSliderModalOpen(true);
  };

  const deleteSlider = () => {
    if (!selectedSlider || !editorRef.current) return;
    
    const slider = selectedSlider.closest('.image-slider') as HTMLElement;
    if (slider) {
      slider.remove();
      updateContent(editorRef.current.innerHTML);
      setSelectedSlider(null);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <div className="bg-muted p-3 border-b border-border flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => execCommand('bold')} title="Bold (Ctrl+B)" className="h-8 px-2">
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('italic')} title="Italic (Ctrl+I)" className="h-8 px-2">
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('insertUnorderedList')} title="Bullet List" className="h-8 px-2">
          <List className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('insertOrderedList')} title="Numbered List" className="h-8 px-2">
          1.
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2" className="h-8 px-2">
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('createLink', prompt('Enter URL') || '')} title="Add Link" className="h-8 px-2">
          <Link className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => imageInputRef.current?.click()} title="Insert Image" className="h-8 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => {setEditingSliderImages(null); setSliderModalOpen(true);}} title="Insert Image Slider" className="h-8 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200">
          <Rows className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyLeft')} title="Align Left" className="h-8 px-2">
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyCenter')} title="Align Center" className="h-8 px-2">
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyRight')} title="Align Right" className="h-8 px-2">
          <AlignRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo" className="h-8 px-2">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo" className="h-8 px-2">
          <Redo2 className="w-4 h-4" />
        </Button>

        {selectedSlider && (
          <>
            <div className="w-px h-6 bg-border" />
            <span className="text-xs text-muted-foreground flex items-center px-2">Slider selected (drag to move)</span>
            <Button size="sm" variant="outline" onClick={editSlider} title="Edit Slider Images" className="h-8 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={deleteSlider} title="Delete Slider" className="h-8 px-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          updateContent(html);
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.image-slider')) {
            setSelectedSlider(target.closest('.image-slider'));
          } else {
            setSelectedSlider(null);
          }
        }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('.image-slider')) {
            handleSliderMouseDown(e);
          }
        }}
        className="min-h-[400px] p-4 focus:outline-none text-base leading-relaxed"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          outline: 'none',
        }}
        data-testid="simple-editor-area"
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageInsert}
        className="hidden"
        data-testid="image-input"
      />

      <ImageSliderModal 
        open={sliderModalOpen} 
        onClose={() => {setSliderModalOpen(false); setEditingSliderImages(null);}} 
        onInsert={handleSliderInsert}
        editingImages={editingSliderImages}
      />

      <style>{`
        .image-slider {
          cursor: grab;
        }
        
        .image-slider:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
}
