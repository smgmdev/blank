import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  content: string;
  onChange: (content: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
}

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export function QuillEditor({ content, onChange, onEmptyChange }: QuillEditorProps) {
  const quillRef = useRef<any>(null);

  useEffect(() => {
    const isEmpty = !content || content === '<p><br></p>' || content.replace(/<[^>]*>/g, '').trim() === '';
    onEmptyChange(isEmpty);
  }, [content, onEmptyChange]);

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'header', 'indent',
    'list',
    'script',
    'align',
    'color', 'background',
    'size',
    'link', 'image', 'video'
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder="Start writing your article..."
        style={{ height: '400px' }}
      />
    </div>
  );
}
