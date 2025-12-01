import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Bold, Italic, Underline, List, ListOrdered, Heading2, Link, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Play, Trash2 } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

interface SimpleEditorProps {
  content: string;
  onChange: (content: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
}

interface ImageSettings {
  title: string;
  caption: string;
  description: string;
}

export function SimpleEditor({ content, onChange, onEmptyChange }: SimpleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>('');
  const [imageSettings, setImageSettings] = useState<ImageSettings>({
    title: '',
    caption: '',
    description: ''
  });

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = content || '';
      setHistory([content || '']);
      setHistoryIndex(0);
      setIsInitialized(true);
      // Attach event listeners to all images for selection
      attachImageListeners();
    }
  }, [isInitialized, content]);

  const attachImageListeners = () => {
    if (!editorRef.current) return;
    const images = editorRef.current.querySelectorAll('.editor-image');
    images.forEach(img => {
      img.addEventListener('click', (e) => {
        const imgId = (e.target as HTMLElement).getAttribute('data-img-id');
        if (imgId) {
          selectImage(imgId);
        }
      });
    });
  };

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
        attachImageListeners();
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
        attachImageListeners();
      }
    }
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgSrc = event.target?.result as string;
        setTempImageSrc(imgSrc);
        setImageSettings({ title: '', caption: '', description: '' });
        setShowImageSettings(true);
      };
      reader.readAsDataURL(file);
    }
    e.currentTarget.value = '';
  };

  const insertImageWithSettings = () => {
    if (!tempImageSrc || !editorRef.current) return;

    // Focus editor and move cursor to end
    editorRef.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const imgId = 'img-' + Date.now();
    const titleAttr = imageSettings.title ? `data-img-title="${imageSettings.title}"` : 'data-img-title=""';
    const captionAttr = imageSettings.caption ? `data-img-caption="${imageSettings.caption}"` : 'data-img-caption=""';
    const descriptionAttr = imageSettings.description ? `data-img-description="${imageSettings.description}"` : 'data-img-description=""';
    
    // Create image container with visible caption
    const captionHtml = imageSettings.caption ? `<div class="img-caption-text" style="margin-top: 8px; font-size: 0.875rem; color: #666; text-align: center; font-style: italic;">${imageSettings.caption}</div>` : '';
    const imgContainer = `<div class="img-container" style="display: inline-block; margin: 10px 0; position: relative;">
      <img class="editor-image" data-img-id="${imgId}" ${titleAttr} ${captionAttr} ${descriptionAttr} src="${tempImageSrc}" style="max-width: 100%; height: auto; border-radius: 6px; cursor: pointer; display: block;" />
      ${captionHtml}
    </div>`;
    
    try {
      document.execCommand('insertHTML', false, imgContainer);
    } catch (err) {
      console.error('Insert HTML failed:', err);
    }

    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
      attachImageListeners();
    }

    setTempImageSrc('');
    setShowImageSettings(false);
  };

  const handleAddVideo = () => {
    if (!videoUrl.trim() || !editorRef.current) return;

    let embedCode = '';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.includes('youtu.be') 
        ? videoUrl.split('youtu.be/')[1] 
        : videoUrl.split('v=')[1];
      embedCode = `<div style="margin: 20px 0;"><iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
    }
    else if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.split('vimeo.com/')[1];
      embedCode = `<div style="margin: 20px 0;"><iframe src="https://player.vimeo.com/video/${videoId}" width="100%" height="400" frameborder="0" allowfullscreen></iframe></div>`;
    }

    if (embedCode && editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, embedCode);
      updateContent(editorRef.current.innerHTML);
      setVideoUrl('');
      setShowVideoDialog(false);
    }
  };

  const selectImage = (imgId: string) => {
    if (!editorRef.current) return;

    // Deselect previous image
    if (selectedImageId !== imgId) {
      const prevImg = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
      if (prevImg) {
        prevImg.style.border = 'none';
        prevImg.style.boxShadow = 'none';
      }
    }

    const img = editorRef.current.querySelector(`[data-img-id="${imgId}"]`) as HTMLImageElement;
    if (img) {
      img.style.border = '2px solid #3b82f6';
      img.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
      img.style.borderRadius = '6px';
      setSelectedImageId(imgId);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('editor-image')) {
      const imgId = target.getAttribute('data-img-id');
      if (imgId) {
        selectImage(imgId);
        e.preventDefault();
        e.stopPropagation();
      }
    } else {
      if (selectedImageId) {
        const img = editorRef.current?.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
        if (img) {
          img.style.border = 'none';
          img.style.boxShadow = 'none';
        }
        setSelectedImageId(null);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!selectedImageId || !editorRef.current) return;
    
    const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
    if (!img) return;

    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = img.offsetWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(100, startWidth + deltaX);
      img.style.width = newWidth + 'px';
      img.style.height = 'auto';
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (editorRef.current) {
        updateContent(editorRef.current.innerHTML);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const alignImage = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedImageId || !editorRef.current) return;
    
    const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
    if (!img) return;
    
    let container = img.closest('.img-container') as HTMLElement;
    
    if (!container) {
      container = document.createElement('div');
      container.classList.add('img-container');
      img.parentNode?.insertBefore(container, img);
      container.appendChild(img);
    }
    
    container.classList.remove('img-left', 'img-center', 'img-right');
    container.style.margin = '10px 0';
    container.style.display = 'block';
    
    if (alignment === 'left') {
      container.classList.add('img-left');
      container.style.textAlign = 'left';
    } else if (alignment === 'center') {
      container.classList.add('img-center');
      container.style.textAlign = 'center';
    } else if (alignment === 'right') {
      container.classList.add('img-right');
      container.style.textAlign = 'right';
    }
    
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const deleteImage = () => {
    if (!selectedImageId || !editorRef.current) return;
    
    const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`);
    if (img) {
      // Remove the entire container (image + caption)
      const container = img.closest('.img-container');
      if (container) {
        container.remove();
      } else {
        img.remove();
      }
      updateContent(editorRef.current.innerHTML);
      setSelectedImageId(null);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <style>{`
        .img-container {
          display: inline-block;
          margin: 10px 0;
          position: relative;
        }
        .img-left {
          text-align: left;
        }
        .img-center {
          text-align: center;
        }
        .img-right {
          text-align: right;
        }
        .editor-image {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          cursor: pointer;
        }
        .img-caption-text {
          margin-top: 8px;
          font-size: 0.875rem;
          color: #666;
          text-align: center;
          font-style: italic;
        }
        .resize-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          background-color: #3b82f6;
          border: 2px solid white;
          border-radius: 4px;
          cursor: nwse-resize;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          top: -10px;
          left: -10px;
          user-select: none;
        }
      `}</style>
      <div className="bg-muted p-2 border-b border-border flex flex-wrap gap-1">
        <Button size="sm" variant="outline" onClick={() => execCommand('bold')} title="Bold" className="h-8 px-2">
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('italic')} title="Italic" className="h-8 px-2">
          <Italic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('underline')} title="Underline" className="h-8 px-2">
          <Underline className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('formatBlock', 'h2')} title="Heading" className="h-8 px-2">
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('insertUnorderedList')} title="Bullet List" className="h-8 px-2">
          <List className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('insertOrderedList')} title="Numbered List" className="h-8 px-2">
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('createLink', prompt('Enter URL') || '')} title="Link" className="h-8 px-2">
          <Link className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => imageInputRef.current?.click()} title="Image" className="h-8 px-2" data-testid="button-insert-image">
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowVideoDialog(true)} title="Embed Video" className="h-8 px-2">
          <Play className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button 
          size="sm" 
          variant={selectedImageId ? "default" : "outline"} 
          onClick={() => alignImage('left')} 
          disabled={!selectedImageId} 
          title="Align Left" 
          className="h-8 px-2"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant={selectedImageId ? "default" : "outline"} 
          onClick={() => alignImage('center')} 
          disabled={!selectedImageId} 
          title="Center" 
          className="h-8 px-2"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant={selectedImageId ? "default" : "outline"} 
          onClick={() => alignImage('right')} 
          disabled={!selectedImageId} 
          title="Align Right" 
          className="h-8 px-2"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo" className="h-8 px-2">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo" className="h-8 px-2">
          <Redo2 className="w-4 h-4" />
        </Button>

        {selectedImageId && (
          <>
            <div className="w-px h-6 bg-border" />
            <Button size="sm" variant="outline" onClick={deleteImage} className="h-8 px-2 bg-red-50 hover:bg-red-100">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {selectedImageId && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-xs text-blue-700 dark:text-blue-200 border-b border-blue-200">
          💡 Drag the blue handle (top-left corner) to resize. Use positioning buttons to align.
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          updateContent(html);
        }}
        onClick={handleEditorClick}
        className="min-h-[400px] p-4 focus:outline-none text-base leading-relaxed relative"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          outline: 'none',
        }}
        data-testid="simple-editor-area"
      />

      {selectedImageId && (
        <div
          onMouseDown={handleResizeStart}
          className="resize-handle"
          title="Drag to resize"
        />
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageInsert}
        className="hidden"
        data-testid="image-input"
      />

      {/* Image Settings Dialog */}
      <Dialog open={showImageSettings} onOpenChange={setShowImageSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Image Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                Title (disabled)
              </Label>
              <Input
                disabled
                className="opacity-50 cursor-not-allowed"
              />
            </div>
            <div>
              <Label htmlFor="img-caption">
                Caption
              </Label>
              <Textarea
                id="img-caption"
                value={imageSettings.caption}
                onChange={(e) => setImageSettings({ ...imageSettings, caption: e.target.value })}
                className="h-24 resize-none"
                data-testid="image-caption"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Description (disabled)
              </Label>
              <Textarea
                disabled
                className="h-24 resize-none opacity-50 cursor-not-allowed"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImageSettings(false);
              setTempImageSrc('');
            }}>Cancel</Button>
            <Button onClick={insertImageWithSettings} data-testid="confirm-image-add">Add Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Embed Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="Paste YouTube or Vimeo link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">Works with YouTube and Vimeo links</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVideoDialog(false)}>Cancel</Button>
            <Button onClick={handleAddVideo}>Embed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
