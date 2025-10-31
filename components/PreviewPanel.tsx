
import React, { useCallback, useState } from 'react';
import { CopyIcon, DownloadIcon, CheckIcon } from './icons';

interface PreviewPanelProps {
  content: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handleDownload = useCallback(() => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comunicado-prensa-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [content]);

  if (!content) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-gray-400 dark:text-gray-500"><path d="M12 13V7"/><path d="M10.25 9.75.5 4.5l3.5-1.5L7.5 5l4.5 2.5-2.5 2.5Z"/><path d="m13.75 9.75 9.75-5.25-3.5-1.5L16.5 5l-4.5 2.5 1.75 2.25Z"/><path d="M12 13v8"/><path d="M12 21a2 2 0 0 0 2-2v-6a2 2 0 0 0-4 0v6a2 2 0 0 0 2 2Z"/></svg>
        </div>
        <h3 className="text-lg font-semibold">Esperando contenido</h3>
        <p className="text-sm">Completa el formulario y haz clic en "Generar" para ver el resultado aquí.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-0 right-0 flex gap-2">
        <button onClick={handleCopy} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Copiar al portapapeles">
          {copied ? <CheckIcon className="text-green-500" /> : <CopyIcon />}
        </button>
        <button onClick={handleDownload} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Descargar como .md">
          <DownloadIcon />
        </button>
      </div>
      <div className="flex-grow overflow-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mt-12">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{content}</pre>
      </div>
    </div>
  );
};

export default PreviewPanel;
