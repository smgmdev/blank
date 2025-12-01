import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Bold, Italic, Underline, List, ListOrdered, Heading2, Link, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Play, Trash2, Settings } from 'lucide-react';
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
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });
  const [settingsButtonPos, setSettingsButtonPos] = useState({ x: 0, y: 0 });
  const [videoHandlePositions, setVideoHandlePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>('');
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageSettings>({
    title: '',
    caption: '',
    description: ''
  });
  const savedSelectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = content || '';
      setHistory([content || '']);
      setHistoryIndex(0);
      setIsInitialized(true);
      // Attach event listeners to all images and videos for selection
      attachMediaListeners();
    }
  }, [isInitialized, content]);

  // Track resize handle position for images and videos
  useEffect(() => {
    if (!selectedImageId && !selectedVideoId || !editorRef.current) return;

    const updateHandlePosition = () => {
      let element: HTMLElement | null = null;
      if (selectedImageId) {
        element = editorRef.current?.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLElement;
      } else if (selectedVideoId) {
        element = editorRef.current?.querySelector(`[data-video-id="${selectedVideoId}"]`) as HTMLElement;
      }
      
      if (element) {
        const rect = element.getBoundingClientRect();
        setHandlePos({ x: rect.left - 10, y: rect.top - 10 });
        // Position settings button at top-right corner
        if (selectedImageId) {
          setSettingsButtonPos({ x: rect.right - 10, y: rect.top - 10 });
        }
      }
    };

    updateHandlePosition();
    
    // Update position on scroll and resize
    window.addEventListener('scroll', updateHandlePosition);
    window.addEventListener('resize', updateHandlePosition);
    document.addEventListener('mousemove', updateHandlePosition);

    return () => {
      window.removeEventListener('scroll', updateHandlePosition);
      window.removeEventListener('resize', updateHandlePosition);
      document.removeEventListener('mousemove', updateHandlePosition);
    };
  }, [selectedImageId, selectedVideoId]);

  // Global Delete and Backspace key handler for media deletion
  useEffect(() => {
    const handleDeleteKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedImageId || selectedVideoId)) {
        e.preventDefault();
        deleteMedia();
      }
    };

    document.addEventListener('keydown', handleDeleteKey);
    return () => {
      document.removeEventListener('keydown', handleDeleteKey);
    };
  }, [selectedImageId, selectedVideoId]);

  // Track all video positions for always-visible resize handles
  useEffect(() => {
    if (!editorRef.current) return;

    const updateVideoPositions = () => {
      const videos = editorRef.current?.querySelectorAll('.editor-video');
      if (!videos) return;

      const positions: Record<string, { x: number; y: number }> = {};
      videos.forEach(video => {
        const vidId = (video as HTMLElement).getAttribute('data-video-id');
        if (vidId) {
          const rect = video.getBoundingClientRect();
          positions[vidId] = { x: rect.left - 10, y: rect.top - 10 };
        }
      });
      setVideoHandlePositions(positions);
    };

    updateVideoPositions();
    
    // Update position on scroll and resize
    window.addEventListener('scroll', updateVideoPositions);
    window.addEventListener('resize', updateVideoPositions);
    document.addEventListener('mousemove', updateVideoPositions);

    return () => {
      window.removeEventListener('scroll', updateVideoPositions);
      window.removeEventListener('resize', updateVideoPositions);
      document.removeEventListener('mousemove', updateVideoPositions);
    };
  }, []);

  // Save cursor position when video or image dialog opens
  useEffect(() => {
    if ((showVideoDialog || showImageSettings) && editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        // Store the range for later restoration
        try {
          const range = selection.getRangeAt(0).cloneRange();
          savedSelectionRef.current = range;
        } catch {
          savedSelectionRef.current = null;
        }
      }
    }
  }, [showVideoDialog, showImageSettings]);

  const attachMediaListeners = () => {
    if (!editorRef.current) return;
    const images = editorRef.current.querySelectorAll('.editor-image');
    images.forEach(img => {
      img.addEventListener('click', (e) => {
        const imgId = (img as HTMLElement).getAttribute('data-img-id');
        if (imgId) {
          setSelectedVideoId(null);
          selectImage(imgId);
        }
      });
    });
    
    const videos = editorRef.current.querySelectorAll('.editor-video');
    videos.forEach(video => {
      const handleClick = (e: any) => {
        const vidId = (video as HTMLElement).getAttribute('data-video-id');
        if (vidId) {
          setSelectedImageId(null);
          selectVideo(vidId);
        }
      };
      video.addEventListener('click', handleClick);
      
      // Also add click handler to the overlay for proper event capture
      const overlay = video.querySelector(`[data-video-overlay]`);
      if (overlay) {
        overlay.addEventListener('click', handleClick);
      }
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
        attachMediaListeners();
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
        attachMediaListeners();
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

    // If editing an existing image, update its caption
    if (editingImageId) {
      const img = editorRef.current.querySelector(`[data-img-id="${editingImageId}"]`) as HTMLImageElement;
      if (img) {
        const container = img.closest('.img-container') as HTMLElement;
        if (container) {
          // Update data attributes
          if (imageSettings.title) {
            img.setAttribute('data-img-title', imageSettings.title);
          }
          if (imageSettings.caption) {
            img.setAttribute('data-img-caption', imageSettings.caption);
          }
          if (imageSettings.description) {
            img.setAttribute('data-img-description', imageSettings.description);
          }
          
          // Remove old caption
          const oldCaption = container.querySelector('.img-caption-text');
          if (oldCaption) oldCaption.remove();
          
          // Add new caption if exists
          if (imageSettings.caption) {
            const captionHtml = `<div class="img-caption-text" contenteditable="false" style="margin-top: 8px; font-size: 0.875rem; color: #666; font-style: italic; text-align: center; word-break: break-word; overflow-wrap: break-word; word-wrap: break-word; white-space: pre-wrap; width: 100%; box-sizing: border-box; user-select: none;">${imageSettings.caption}</div>`;
            container.insertAdjacentHTML('beforeend', captionHtml);
          }
          
          updateContent(editorRef.current.innerHTML);
          setEditingImageId(null);
          setShowImageSettings(false);
          setTempImageSrc('');
          return;
        }
      }
    }

    // New image insertion - use DOM methods to ensure proper structure
    const imgId = 'img-' + Date.now();
    
    // Create container div
    const containerDiv = document.createElement('div');
    containerDiv.className = 'img-container';
    containerDiv.style.cssText = 'display: block; margin: 10px 0; max-width: 100%; width: fit-content; text-align: center;';
    
    // Create image element
    const img = document.createElement('img');
    img.className = 'editor-image';
    img.setAttribute('data-img-id', imgId);
    img.setAttribute('data-img-title', imageSettings.title);
    img.setAttribute('data-img-caption', imageSettings.caption);
    img.setAttribute('data-img-description', imageSettings.description);
    img.src = tempImageSrc;
    img.style.cssText = 'max-width: 100%; height: auto; border-radius: 6px; cursor: pointer; margin: 0 auto; display: block;';
    
    // Append image to container
    containerDiv.appendChild(img);
    
    // Create and append caption if exists
    if (imageSettings.caption.trim()) {
      const captionDiv = document.createElement('div');
      captionDiv.className = 'img-caption-text';
      captionDiv.setAttribute('contenteditable', 'false');
      captionDiv.textContent = imageSettings.caption;
      captionDiv.style.cssText = 'margin-top: 8px; font-size: 0.875rem; color: #666; font-style: italic; text-align: center; word-break: break-word; overflow-wrap: break-word; word-wrap: break-word; white-space: pre-wrap; width: 100%; box-sizing: border-box; user-select: none;';
      containerDiv.appendChild(captionDiv);
    }
    
    // Append container to editor
    editorRef.current.appendChild(containerDiv);
    
    updateContent(editorRef.current.innerHTML);
    attachMediaListeners();

    setTempImageSrc('');
    setShowImageSettings(false);
    savedSelectionRef.current = null;
  };

  const openImageSettings = () => {
    if (!selectedImageId || !editorRef.current) return;
    
    const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
    if (img) {
      setEditingImageId(selectedImageId);
      setImageSettings({
        title: img.getAttribute('data-img-title') || '',
        caption: img.getAttribute('data-img-caption') || '',
        description: img.getAttribute('data-img-description') || ''
      });
      setShowImageSettings(true);
    }
  };

  const handleAddVideo = () => {
    if (!videoUrl.trim() || !editorRef.current) return;

    let embedCode = '';
    const url = videoUrl.trim();
    
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        
        if (url.includes('youtu.be/')) {
          // Handle youtu.be short URLs: https://youtu.be/dQw4w9WgXcQ
          videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (url.includes('v=')) {
          // Handle youtube.com URLs: https://www.youtube.com/watch?v=dQw4w9WgXcQ
          videoId = url.split('v=')[1]?.split('&')[0] || '';
        }
        
        if (videoId) {
          embedCode = `<div style="margin: 20px 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 6px;">
            <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
          </div>`;
        }
      }

      if (embedCode && editorRef.current) {
        const vidId = 'video-' + Date.now();
        
        // Use insertHTML just like images for consistent behavior
        // Container is editable so cursor can be positioned, with empty text nodes for cursor visibility
        const videoContainer = `<div class="video-container" style="display: block; margin: 10px 0; max-width: 100%; width: fit-content; text-align: center;">
          <div class="editor-video" data-video-id="${vidId}" contenteditable="false" style="display: inline-block; cursor: pointer; position: relative; border: 2px solid transparent; border-radius: 6px; overflow: hidden; max-width: 100%; margin: 0 auto; width: 640px; height: 360px;">
            ${embedCode}
          </div>
          <br>
        </div>`;
        
        // Restore cursor to original position
        editorRef.current.focus();
        const selection = window.getSelection();
        
        // Try to restore saved selection first
        if (savedSelectionRef.current && selection) {
          try {
            selection.removeAllRanges();
            selection.addRange(savedSelectionRef.current);
          } catch {
            // Fallback: if saved selection is invalid, just use current position
          }
        }
        
        try {
          document.execCommand('insertHTML', false, videoContainer);
        } catch (err) {
          console.error('Insert video HTML failed:', err);
        }

        if (editorRef.current) {
          updateContent(editorRef.current.innerHTML);
          attachMediaListeners();
        }

        setVideoUrl('');
        setShowVideoDialog(false);
        savedSelectionRef.current = null;
      } else {
        console.warn('Could not extract video ID from URL:', url);
      }
    } catch (error) {
      console.error('Video embedding error:', error);
    }
  };

  const selectImage = (imgId: string) => {
    if (!editorRef.current) return;

    // Deselect previous image/container
    if (selectedImageId !== imgId) {
      const prevImg = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
      if (prevImg) {
        const prevContainer = prevImg.closest('.img-container') as HTMLElement;
        if (prevContainer) {
          prevContainer.style.border = 'none';
          prevContainer.style.boxShadow = 'none';
        } else {
          prevImg.style.border = 'none';
          prevImg.style.boxShadow = 'none';
        }
      }
    }

    const img = editorRef.current.querySelector(`[data-img-id="${imgId}"]`) as HTMLImageElement;
    if (img) {
      // Select the entire container (image + caption)
      const container = img.closest('.img-container') as HTMLElement;
      if (container) {
        container.style.border = '2px solid #3b82f6';
        container.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
        container.style.borderRadius = '6px';
        container.style.outline = 'none';
      } else {
        img.style.border = '2px solid #3b82f6';
        img.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
        img.style.borderRadius = '6px';
      }
      setSelectedImageId(imgId);
    }
  };

  const selectVideo = (vidId: string) => {
    if (!editorRef.current) return;

    // Deselect previous video
    if (selectedVideoId !== vidId) {
      const prevVid = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`) as HTMLElement;
      if (prevVid) {
        const prevContainer = prevVid.closest('.video-container') as HTMLElement;
        if (prevContainer) {
          prevContainer.style.border = 'none';
          prevContainer.style.boxShadow = 'none';
        } else {
          prevVid.style.border = 'none';
          prevVid.style.boxShadow = 'none';
        }
      }
    }

    const video = editorRef.current.querySelector(`[data-video-id="${vidId}"]`) as HTMLElement;
    if (video) {
      // Apply styling to container instead of video div to avoid gaps
      const container = video.closest('.video-container') as HTMLElement;
      if (container) {
        container.style.border = '2px solid #3b82f6';
        container.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
        container.style.borderRadius = '6px';
      } else {
        video.style.border = '2px solid #3b82f6';
        video.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
        video.style.borderRadius = '6px';
      }
      setSelectedVideoId(vidId);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking on image
    if (target.classList.contains('editor-image')) {
      const imgId = target.getAttribute('data-img-id');
      if (imgId) {
        selectImage(imgId);
        e.preventDefault();
        e.stopPropagation();
      }
    } 
    // Check if clicking on caption
    else if (target.classList.contains('img-caption-text')) {
      const container = target.closest('.img-container') as HTMLElement;
      const img = container?.querySelector('.editor-image') as HTMLImageElement;
      if (img) {
        const imgId = img.getAttribute('data-img-id');
        if (imgId) {
          selectImage(imgId);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    } 
    // Deselect when clicking elsewhere
    else {
      if (selectedImageId) {
        const img = editorRef.current?.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
        if (img) {
          const container = img.closest('.img-container') as HTMLElement;
          if (container) {
            container.style.border = 'none';
            container.style.boxShadow = 'none';
          } else {
            img.style.border = 'none';
            img.style.boxShadow = 'none';
          }
        }
        setSelectedImageId(null);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent, targetVideoId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editorRef.current) return;

    let element: HTMLElement | null = null;
    
    // Determine which element to resize
    if (targetVideoId) {
      element = editorRef.current.querySelector(`[data-video-id="${targetVideoId}"]`) as HTMLElement;
      // Select the video if not already selected
      if (!selectedVideoId) {
        selectVideo(targetVideoId);
      }
    } else if (selectedImageId) {
      element = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLElement;
    } else if (selectedVideoId) {
      element = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`) as HTMLElement;
    }
    
    if (!element) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(100, startHeight - deltaY);
      const scale = newHeight / startHeight;
      const newWidth = Math.max(100, startWidth * scale);
      element.style.setProperty('width', newWidth + 'px', 'important');
      element.style.setProperty('height', newHeight + 'px', 'important');
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

  const alignContent = (alignment: 'left' | 'center' | 'right') => {
    if (editorRef.current) {
      if (selectedImageId) {
        const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
        if (img) {
          let container = img.closest('.img-container') as HTMLElement;
          if (!container) {
            container = document.createElement('div');
            container.classList.add('img-container');
            img.parentNode?.insertBefore(container, img);
            container.appendChild(img);
          }
          const caption = container.querySelector('.img-caption-text') as HTMLElement;
          container.classList.remove('img-left', 'img-center', 'img-right');
          container.style.margin = '10px 0';
          container.style.display = 'block';
          if (alignment === 'left') {
            container.classList.add('img-left');
            container.style.textAlign = 'left';
            if (caption) caption.style.textAlign = 'left';
          } else if (alignment === 'center') {
            container.classList.add('img-center');
            container.style.textAlign = 'center';
            if (caption) caption.style.textAlign = 'center';
          } else if (alignment === 'right') {
            container.classList.add('img-right');
            container.style.textAlign = 'right';
            if (caption) caption.style.textAlign = 'right';
          }
          updateContent(editorRef.current.innerHTML);
          return;
        }
      } else if (selectedVideoId) {
        const video = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`) as HTMLElement;
        if (video) {
          let container = video.closest('.video-container') as HTMLElement;
          if (!container) {
            container = document.createElement('div');
            container.classList.add('video-container');
            video.parentNode?.insertBefore(container, video);
            container.appendChild(video);
          }
          container.classList.remove('video-left', 'video-center', 'video-right');
          container.style.margin = '20px 0';
          container.style.display = 'block';
          if (alignment === 'left') {
            container.classList.add('video-left');
            container.style.textAlign = 'left';
          } else if (alignment === 'center') {
            container.classList.add('video-center');
            container.style.textAlign = 'center';
          } else if (alignment === 'right') {
            container.classList.add('video-right');
            container.style.textAlign = 'right';
          }
          updateContent(editorRef.current.innerHTML);
          return;
        }
      }
    }
    
    const alignmentMap = {
      'left': 'justifyLeft',
      'center': 'justifyCenter',
      'right': 'justifyRight'
    };
    execCommand(alignmentMap[alignment]);
  };

  const deleteMedia = () => {
    if (!editorRef.current) return;
    
    if (selectedImageId) {
      const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLElement;
      console.log('[deleteMedia] Found img:', !!img, 'selectedImageId:', selectedImageId);
      if (img) {
        // Always remove the entire img-container (which includes both image and caption)
        const container = img.closest('.img-container') as HTMLElement;
        console.log('[deleteMedia] Found container:', !!container);
        if (container) {
          console.log('[deleteMedia] Container HTML before remove:', container.outerHTML.substring(0, 100));
          container.remove();
          console.log('[deleteMedia] Container removed');
        } else {
          console.log('[deleteMedia] No container found, img:', img.outerHTML.substring(0, 100));
          img.remove();
        }
        updateContent(editorRef.current.innerHTML);
        setSelectedImageId(null);
      }
    } else if (selectedVideoId) {
      const video = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`) as HTMLElement;
      if (video) {
        const container = video.closest('.video-container') as HTMLElement;
        if (container) {
          container.remove();
        }
        updateContent(editorRef.current.innerHTML);
        setSelectedVideoId(null);
      }
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    // Delete key support for selected media
    if (e.key === 'Delete' && (selectedImageId || selectedVideoId)) {
      e.preventDefault();
      deleteMedia();
      return;
    }
    
    // When Enter is pressed on selected image, move cursor after container
    if ((e.key === 'Enter' || e.key === 'ArrowDown') && selectedImageId && !editorRef.current) return;
    
    // Handle ArrowUp on selected image/video to allow space above
    if (e.key === 'ArrowUp' && (selectedImageId || selectedVideoId) && editorRef.current) {
      e.preventDefault();
      
      let container: HTMLElement | null = null;
      if (selectedImageId) {
        const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`);
        container = img?.closest('.img-container') || null;
      } else if (selectedVideoId) {
        const video = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`);
        container = video?.closest('.video-container') || null;
      }
      
      if (container) {
        // Get the position of the container in the editor
        const containerIndex = Array.from(editorRef.current.children).indexOf(container);
        
        // If container is at the very top, create space above it
        if (containerIndex === 0) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          editorRef.current.insertBefore(p, container);
          
          // Position cursor in the new paragraph
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(p);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } else {
          // Move cursor to the end of the element before the container
          const elementBefore = editorRef.current.children[containerIndex - 1] as HTMLElement;
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(elementBefore);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        
        // Deselect media
        if (selectedImageId) {
          const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`);
          if (img) {
            const imgContainer = img.closest('.img-container') as HTMLElement;
            if (imgContainer) {
              imgContainer.style.border = 'none';
              imgContainer.style.boxShadow = 'none';
            }
          }
          setSelectedImageId(null);
        } else if (selectedVideoId) {
          const video = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`);
          if (video) {
            const vidContainer = video.closest('.video-container') as HTMLElement;
            if (vidContainer) {
              vidContainer.style.border = 'none';
              vidContainer.style.boxShadow = 'none';
            }
          }
          setSelectedVideoId(null);
        }
        
        updateContent(editorRef.current.innerHTML);
      }
      return;
    }

    // Handle ArrowDown on selected video to move cursor after it
    if (e.key === 'ArrowDown' && selectedVideoId && editorRef.current) {
      e.preventDefault();
      
      const video = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`);
      const container = video?.closest('.video-container') as HTMLElement;
      
      if (container) {
        // Position cursor just after the container
        const range = document.createRange();
        const selection = window.getSelection();
        const containerIndex = Array.from(editorRef.current.children).indexOf(container);
        range.setStart(editorRef.current, containerIndex + 1);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        // Deselect video
        if (container) {
          container.style.border = 'none';
          container.style.boxShadow = 'none';
        }
        setSelectedVideoId(null);
      }
      return;
    }
    
    if (e.key === 'Enter' && (selectedImageId || selectedVideoId)) {
      if (!editorRef.current) return;
      
      e.preventDefault();
      
      let container: HTMLElement | null = null;
      if (selectedImageId) {
        const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`);
        container = img?.closest('.img-container') || null;
      } else if (selectedVideoId) {
        const video = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`);
        container = video?.closest('.video-container') || null;
      }
      
      if (container) {
        // Create a new line after the container
        const newLine = document.createElement('div');
        newLine.innerHTML = '<br>';
        container.parentNode?.insertBefore(newLine, container.nextSibling);
        
        // Move cursor to the new line
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(newLine);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        // Deselect media
        if (selectedImageId) {
          const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`);
          if (img) {
            const imgContainer = img.closest('.img-container') as HTMLElement;
            if (imgContainer) {
              imgContainer.style.border = 'none';
              imgContainer.style.boxShadow = 'none';
            } else {
              img.style.border = 'none';
              img.style.boxShadow = 'none';
            }
          }
          setSelectedImageId(null);
        } else if (selectedVideoId) {
          const video = editorRef.current.querySelector(`[data-video-id="${selectedVideoId}"]`);
          if (video) {
            const vidContainer = video.closest('.video-container') as HTMLElement;
            if (vidContainer) {
              vidContainer.style.border = 'none';
              vidContainer.style.boxShadow = 'none';
            } else {
              video.style.border = 'none';
              video.style.boxShadow = 'none';
            }
          }
          setSelectedVideoId(null);
        }
        
        updateContent(editorRef.current.innerHTML);
      }
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <style>{`
        /* Editor cursor always visible */
        [contenteditable="true"] {
          caret-color: #000;
        }
        
        /* Image styles */
        .img-container {
          display: inline-block !important;
          margin: 10px 0 !important;
          position: relative;
          max-width: 100%;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
        }
        .img-left {
          text-align: left !important;
          display: block !important;
        }
        .img-left .editor-image {
          margin: 0 0 !important;
          display: block !important;
        }
        .img-center {
          text-align: center !important;
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .img-center .editor-image {
          margin: 0 auto !important;
          display: block !important;
        }
        .img-right {
          text-align: right !important;
          display: block !important;
        }
        .img-right .editor-image {
          margin: 0 0 0 auto !important;
          display: block !important;
        }
        .editor-image {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          border-radius: 6px;
          cursor: pointer;
        }
        .img-caption-text {
          margin-top: 8px;
          font-size: 0.875rem;
          color: #666;
          text-align: center;
          font-style: italic;
          word-break: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          width: 100%;
          box-sizing: border-box;
          display: block;
          cursor: pointer;
          user-select: none;
        }
        
        /* Video styles */
        .video-container {
          display: block !important;
          margin: 10px 0 !important;
          position: relative;
          max-width: 100%;
          width: fit-content;
          text-align: center;
        }
        .video-left {
          text-align: left !important;
          display: block !important;
        }
        .video-left .editor-video {
          margin: 0 0 !important;
          display: block !important;
        }
        .video-center {
          text-align: center !important;
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .video-center .editor-video {
          margin: 0 auto !important;
          display: block !important;
        }
        .video-right {
          text-align: right !important;
          display: block !important;
        }
        .video-right .editor-video {
          margin: 0 0 0 auto !important;
          display: block !important;
        }
        .editor-video {
          display: inline-block !important;
          cursor: pointer;
          position: relative;
          border-radius: 6px;
          overflow: hidden;
          width: 640px;
          max-width: 100%;
          margin: 0 auto;
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
      <div className="bg-muted p-2 border-b border-border flex flex-wrap gap-1 sticky top-0 z-50">
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
          variant={selectedImageId || selectedVideoId ? "default" : "outline"} 
          onClick={() => alignContent('left')} 
          title="Align Left" 
          className="h-8 px-2"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant={selectedImageId || selectedVideoId ? "default" : "outline"} 
          onClick={() => alignContent('center')} 
          title="Center" 
          className="h-8 px-2"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant={selectedImageId || selectedVideoId ? "default" : "outline"} 
          onClick={() => alignContent('right')} 
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

        {(selectedImageId || selectedVideoId) && (
          <>
            <div className="w-px h-6 bg-border" />
            <Button size="sm" variant="outline" onClick={deleteMedia} className="h-8 px-2 bg-red-50 hover:bg-red-100">
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
        onKeyDown={handleEditorKeyDown}
        className="min-h-[400px] p-4 focus:outline-none text-base leading-relaxed relative"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          outline: 'none',
        }}
        data-testid="simple-editor-area"
      />

      {Object.entries(videoHandlePositions).map(([vidId, pos]) => (
        <div
          key={vidId}
          onMouseDown={(e) => handleResizeStart(e, vidId)}
          style={{
            position: 'fixed',
            width: '20px',
            height: '20px',
            backgroundColor: '#3b82f6',
            border: '2px solid white',
            borderRadius: '4px',
            cursor: 'nwse-resize',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            left: pos.x + 'px',
            top: pos.y + 'px',
            opacity: 0.8,
          }}
          title="Drag to resize"
        />
      ))}
      
      {selectedImageId && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'fixed',
            width: '20px',
            height: '20px',
            backgroundColor: '#3b82f6',
            border: '2px solid white',
            borderRadius: '4px',
            cursor: 'nwse-resize',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            left: handlePos.x + 'px',
            top: handlePos.y + 'px',
          }}
          title="Drag to resize"
        />
      )}

      {selectedImageId && (
        <button
          onClick={openImageSettings}
          style={{
            position: 'fixed',
            width: '32px',
            height: '32px',
            backgroundColor: '#3b82f6',
            border: '2px solid white',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            left: settingsButtonPos.x + 'px',
            top: settingsButtonPos.y + 'px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
          }}
          title="Edit caption"
        >
          <Settings size={16} color="white" />
        </button>
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
            {tempImageSrc && (
              <div className="flex justify-center">
                <img src={tempImageSrc} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px' }} />
              </div>
            )}
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
                Caption (required)
              </Label>
              <Textarea
                id="img-caption"
                value={imageSettings.caption}
                onChange={(e) => setImageSettings({ ...imageSettings, caption: e.target.value })}
                className="h-24 resize-none"
                placeholder="Add a caption for the image..."
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
          {!imageSettings.caption.trim() && (
            <div className="text-xs text-red-500 px-0 py-1">
              *Caption is required to add image
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImageSettings(false);
              setTempImageSrc('');
              setEditingImageId(null);
            }}>Cancel</Button>
            <Button 
              onClick={insertImageWithSettings} 
              disabled={!imageSettings.caption.trim()}
              data-testid="confirm-image-add"
            >
              {editingImageId ? 'Save' : 'Add Image'}
            </Button>
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
                placeholder="Paste YouTube link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">Supports YouTube links</p>
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
