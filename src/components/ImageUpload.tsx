import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const base64 = await resizeAndCompressImage(file);
      onChange(base64);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Erro ao processar imagem. Tente uma foto menor.");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Quality 0.7 to keep size small for Firestore
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">{label}</label>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed border-white/5 rounded-2xl overflow-hidden transition-all hover:border-brand-primary/40",
          value ? "h-48" : "h-32 flex flex-col items-center justify-center gap-2 bg-white/5"
        )}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} className="text-brand-primary" />
                <span className="text-[10px] font-black uppercase text-white">Alterar Imagem</span>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white/50 hover:text-white"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/20 group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-all">
              {isCompressing ? <Loader2 size={24} className="animate-spin text-brand-primary" /> : <ImageIcon size={24} />}
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Clique para Enviar</p>
              <p className="text-[9px] text-white/20 uppercase">JPG, PNG (Max 800px)</p>
            </div>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
      
      {/* Fallback for manual URL if needed */}
      <input 
        value={value.startsWith('data:') ? 'Imagem Carregada' : value}
        onChange={e => onChange(e.target.value)}
        placeholder="Ou cole a URL da imagem aqui..."
        className="w-full bg-white/5 p-3 rounded-xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-[10px] text-white/40" 
      />
    </div>
  );
}
