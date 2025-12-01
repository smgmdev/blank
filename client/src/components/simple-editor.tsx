import { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import List from '@editorjs/list';
import Image from '@editorjs/image';
import Embed from '@editorjs/embed';
import Table from '@editorjs/table';
import Code from '@editorjs/code';
import Quote from '@editorjs/quote';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';

interface SimpleEditorProps {
  content: string;
  onChange: (content: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
}

export function SimpleEditor({ content, onChange, onEmptyChange }: SimpleEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isReady) return;

    const initEditor = async () => {
      try {
        const editor = new EditorJS({
          holder: containerRef.current!,
          tools: {
            header: Header,
            paragraph: {
              class: Paragraph,
              inlineToolbar: true,
            },
            list: {
              class: List,
              inlineToolbar: true,
            },
            image: {
              class: Image,
              config: {
                uploader: {
                  async uploadByFile(file: File) {
                    return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        resolve({
                          success: 1,
                          file: {
                            url: e.target?.result as string,
                          },
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  },
                  async uploadByUrl(url: string) {
                    return {
                      success: 1,
                      file: { url },
                    };
                  },
                },
              },
            },
            embed: Embed,
            table: Table,
            code: Code,
            quote: Quote,
            Marker: Marker,
            inlineCode: InlineCode,
          },
          onReady: () => {
            editorRef.current = editor;
            if (content) {
              try {
                const parsed = JSON.parse(content);
                editor.render(parsed);
              } catch {
                // If content is not valid JSON, start fresh
              }
            }
          },
          onChange: async () => {
            const data = await editor.save();
            const json = JSON.stringify(data);
            onChange(json);
            onEmptyChange(!data.blocks || data.blocks.length === 0);
          },
        });
      } catch (error) {
        console.error('Editor initialization error:', error);
      }
      setIsReady(true);
    };

    initEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [content, onChange, onEmptyChange, isReady]);

  return (
    <div className="editor-container bg-white dark:bg-slate-950 rounded-lg border border-border overflow-hidden">
      <div
        ref={containerRef}
        id="editorjs"
        className="editor-area p-4"
        data-testid="simple-editor-area"
        style={{ minHeight: '400px' }}
      />
      <style>{`
        .ce-block {
          margin-bottom: 20px;
        }

        .ce-toolbar__content,
        .ce-block__content {
          max-width: none;
        }

        .ce-editor {
          background: transparent;
        }

        .ce-toolbar {
          background: #f5f5f5;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 12px;
        }

        .ce-toolbar__settings-btn {
          opacity: 0.6;
        }

        .ce-toolbar__settings-btn:hover {
          opacity: 1;
        }

        .ce-popover {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .ce-popover__item-icon {
          width: 24px;
          height: 24px;
        }
      `}</style>
    </div>
  );
}
