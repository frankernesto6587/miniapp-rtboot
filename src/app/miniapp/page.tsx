'use client';
import Script from 'next/script';
import { useEffect, useState, useRef } from 'react';
import type { StartPayload, TelegramWebApp } from '@/types/telegram';

function decodeStart<T>(sp: string): T | null {
  try { return JSON.parse(Buffer.from(sp, 'base64').toString('utf8')) as T; }
  catch { return null; }
}

type FormData = {
  imagen: File | null;
  nombre: string;
  monto: string;
  code: string;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function MiniAppPage() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [payload, setPayload] = useState<StartPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    imagen: null,
    nombre: '',
    monto: '',
    code: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa SDK
  useEffect(() => {
    const api = (window as any).Telegram?.WebApp as TelegramWebApp | undefined;
    
    // Si no está en Telegram, intentar obtener parámetro de la URL
    if (!api) {
      
      const urlParams = new URLSearchParams(window.location.search);
      const startParam = urlParams.get('startParam');
      
      
      if (!startParam) {
        return setError('Ábrelo dentro de Telegram o usa el enlace correcto.');
      }
      
      const p = decodeStart<StartPayload>(startParam);
      
      if (!p) { 
        setError('start_param inválido.'); 
        return; 
      }
      
      setPayload(p);
      return;
    }
    
    // Si está en Telegram, usar el SDK normal
    api.ready(); api.expand();
    setTg(api);

    
    // Primero intentar con start_param del SDK
    let sp = api.initDataUnsafe?.start_param;
    
    // Si no hay start_param en el SDK, intentar con URL params
    if (!sp) {
      const urlParams = new URLSearchParams(window.location.search);
      sp = urlParams.get('startParam') ?? undefined;
    }
    
    if (!sp) { 
      setError('Usa /abrir dentro de un TEMA para obtener el contexto.'); 
      return; 
    }

    const p = decodeStart<StartPayload>(sp);
    
    if (!p) { 
      setError('start_param inválido.'); 
      return; 
    }
    
    
    setPayload(p);
  }, []);

  // Validar tipo de archivo compatible con Telegram
  const isValidImageFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB límite de Telegram
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  };

  // Manejar selección de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      setError('La imagen debe ser JPEG, PNG, GIF o WebP y menor a 10MB');
      return;
    }

    setFormData(prev => ({ ...prev, imagen: file }));
    
    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  // Manejar cambios en inputs
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validar formulario
  const isFormValid = (): boolean => {
    return formData.imagen !== null && 
           formData.nombre.trim() !== '' && 
           formData.monto.trim() !== '' &&
           /^\d+(\.\d{1,2})?$/.test(formData.monto); // Validar formato de monto
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || !tg || !payload) return;

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('imagen', formData.imagen!);
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('monto', formData.monto);
      formDataToSend.append('code', formData.code);
      formDataToSend.append('initData', tg.initData);
      formDataToSend.append('bancoId', payload.banco.id.toString());

      const res = await fetch(`${apiUrl}/miniapp/submit-form`, {
      method: 'POST',
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al enviar formulario');
      }

      // Mostrar éxito y cerrar
      tg.showAlert('Formulario enviado exitosamente', () => {
    tg.close();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6">
            <h1 className="text-xl font-bold text-white text-center">
              💳 Información Bancaria
            </h1>
            {payload && (
              <p className="text-blue-100 text-center mt-2 text-sm">
                {payload.banco.nombre}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="text-red-400 mr-3">⚠️</div>
                  <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {payload ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Upload de Imagen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Imagen del Comprobante *
                  </label>
                  
                  <div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <div className="space-y-3">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-h-48 mx-auto rounded-lg object-contain"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Toca para cambiar imagen
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-4xl">📸</div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-300 font-medium">
                            Seleccionar imagen
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            JPEG, PNG, GIF o WebP (máx. 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre del Titular *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Ingresa el nombre completo"
                  />
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monto *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      type="text"
                      value={formData.monto}
                      onChange={(e) => handleInputChange('monto', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="0.00"
                      pattern="[0-9]+(\.[0-9]{1,2})?"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Formato: 123.45 (solo números y punto decimal)
                  </p>
                </div>

                {/* Código (Opcional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Código de Referencia
                    <span className="text-gray-400 dark:text-gray-500 text-sm"> (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Código de referencia o nota"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    isFormValid() && !isSubmitting
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="mr-2">📤</span>
                      Enviar Información
                    </div>
                  )}
            </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Cargando formulario...
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
