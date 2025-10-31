
import React, { useState, useCallback } from 'react';
import { type FormData, type GenerationOptions, type Tone } from './types';
import { generatePressRelease } from './services/geminiService';
import FormField from './components/FormField';
import Button from './components/Button';
import PreviewPanel from './components/PreviewPanel';
import { SparklesIcon, AlertTriangleIcon } from './components/icons';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    topic: '',
    keyFacts: '',
    quote: '',
    spokesperson: '',
    callToAction: '',
    contactInfo: '',
    tone: 'informativo',
    location: '',
    releaseDate: new Date().toISOString().split('T')[0],
  });

  const [options, setOptions] = useState<GenerationOptions>({
    generateSocialPosts: true,
    language: 'ES',
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleOptionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    setOptions(prev => ({ ...prev, [id]: checked }));
  }, []);
  
  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions(prev => ({ ...prev, language: e.target.value as 'ES' | 'EN' }));
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.keyFacts.trim()) newErrors.keyFacts = 'Los hechos clave son obligatorios.';
    if (!formData.contactInfo.trim()) newErrors.contactInfo = 'La información de contacto es obligatoria.';
    if (formData.quote.trim() && (!formData.quote.startsWith('"') || !formData.quote.endsWith('"'))) {
      newErrors.quote = 'Aviso: La cita no parece estar entre comillas.';
    }
    
    setValidationErrors(newErrors);
    return !newErrors.keyFacts && !newErrors.contactInfo;
  };

  const handleGenerate = async () => {
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult('');
    try {
      const generatedContent = await generatePressRelease(formData, options);
      setResult(generatedContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
          Generador de Comunicados de Prensa
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          Crea contenido profesional al instante con la potencia de Gemini.
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">1. Completa la información</h2>
          <div className="space-y-4">
            <FormField id="topic" label="Tema / Título provisional" type="text" value={formData.topic} onChange={handleFormChange} required placeholder="Ej: Lanzamiento nuevo producto ecológico"/>
            <FormField id="keyFacts" label="Hechos clave (uno por línea)" type="textarea" value={formData.keyFacts} onChange={handleFormChange} required rows={4} placeholder="- Característica principal 1&#10;- Dato relevante 2&#10;- Beneficio para el usuario 3" error={validationErrors.keyFacts} />
            <FormField id="quote" label="Cita textual" type="textarea" value={formData.quote} onChange={handleFormChange} required placeholder={`"Estamos muy orgullosos de este logro..."`} error={validationErrors.quote && !validationErrors.quote.startsWith('Aviso') ? validationErrors.quote : undefined} warning={validationErrors.quote?.startsWith('Aviso') ? validationErrors.quote : undefined}/>
            <FormField id="spokesperson" label="Portavoz y cargo" type="text" value={formData.spokesperson} onChange={handleFormChange} required placeholder="Ana Pérez, Directora de Innovación"/>
            <FormField id="callToAction" label="Llamado a la acción" type="text" value={formData.callToAction} onChange={handleFormChange} required placeholder="Visita nuestra web para más detalles"/>
            <FormField id="contactInfo" label="Información de contacto" type="textarea" value={formData.contactInfo} onChange={handleFormChange} required rows={3} placeholder="Nombre Apellido&#10;prensa@empresa.com&#10;+34 123 456 789" error={validationErrors.contactInfo}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="tone" label="Tono" type="select" value={formData.tone} onChange={handleFormChange} required options={[{value: 'informativo', label: 'Informativo'}, {value: 'celebratorio', label: 'Celebratorio'}, {value: 'urgente', label: 'Urgente'}]}/>
              <FormField id="location" label="Ámbito / Localidad" type="text" value={formData.location} onChange={handleFormChange} required placeholder="Madrid, España"/>
            </div>
             <FormField id="releaseDate" label="Fecha del comunicado" type="date" value={formData.releaseDate} onChange={handleFormChange} required/>
          </div>
          
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">2. Ajusta la salida</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                    <input type="checkbox" id="generateSocialPosts" checked={options.generateSocialPosts} onChange={handleOptionsChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                    <label htmlFor="generateSocialPosts" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Generar posts sociales</label>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="language" className="block text-sm font-medium text-gray-900 dark:text-gray-300">Idioma principal:</label>
                    <select id="language" value={options.language} onChange={handleLanguageChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                        <option value="ES">Español</option>
                        <option value="EN">Inglés</option>
                    </select>
                </div>
            </div>
          </div>

          <div className="mt-8">
            <Button onClick={handleGenerate} disabled={isLoading} fullWidth>
              <SparklesIcon />
              {isLoading ? 'Generando...' : 'Generar contenido'}
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
           <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">3. Vista Previa</h2>
          {isLoading && (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Generando tu contenido...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Esto puede tardar unos segundos.</p>
            </div>
          )}
          {error && (
            <div className="flex-grow flex flex-col items-center justify-center text-center bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <AlertTriangleIcon className="w-12 h-12 text-red-500"/>
                <p className="mt-4 text-lg font-semibold text-red-700 dark:text-red-300">Error al generar</p>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {!isLoading && !error && (
            <PreviewPanel content={result} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
