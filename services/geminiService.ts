
import { GoogleGenAI } from "@google/genai";
import type { FormData, GenerationOptions } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generatePrompt = (data: FormData, options: GenerationOptions): string => {
  const primaryLang = options.language === 'ES' ? 'español' : 'inglés';
  const secondaryLang = options.language === 'ES' ? 'inglés' : 'español';
  const primaryStyle = options.language === 'ES' ? 'normas EFE/RAE (ej. dateline: "Salamanca, 31 de octubre de 2025")' : 'estilo AP (Associated Press)';
  const secondaryStyle = options.language === 'ES' ? 'estilo AP (Associated Press)' : 'normas EFE/RAE';

  const socialPostsSection = options.generateSocialPosts
    ? `
---

## Posts para Redes Sociales

### X (Twitter)
Crea un post para X de máximo 280 caracteres.

### LinkedIn
Crea un post para LinkedIn de máximo 300 caracteres, con un tono más profesional.

### Instagram
Crea un post para Instagram de entre 150 y 220 caracteres, con un tono más visual y cercano. Incluye 3-5 hashtags relevantes.
`
    : '';

  return `
    Eres un experto en comunicación corporativa y relaciones públicas. Tu tarea es generar un paquete completo de comunicación basado en la siguiente información. Debes seguir todas las instrucciones y reglas editoriales de forma estricta.

    **Información de entrada:**
    - **Tema/Título provisional:** ${data.topic || '[PENDIENTE: Definir tema]'}
    - **Hechos clave (uno por línea):**\n${data.keyFacts}
    - **Cita textual:** ${data.quote ? `"${data.quote.replace(/"/g, '')}"` : '[PENDIENTE: Insertar cita]'}
    - **Portavoz y cargo:** ${data.spokesperson || '[PENDiente: Definir portavoz]'}
    - **Llamado a la acción:** ${data.callToAction || '[PENDIENTE: Definir llamado a la acción]'}
    - **Información de contacto:**\n${data.contactInfo}
    - **Tono deseado:** ${data.tone}
    - **Ámbito/Localidad:** ${data.location}
    - **Fecha del comunicado:** ${data.releaseDate}

    **Reglas Editoriales Estrictas:**
    1.  **No inventes datos ni citas.** Si falta información crucial que no se puede deducir, indícalo claramente con la etiqueta [PENDIENTE: describir lo que falta].
    2.  **Neutralidad institucional:** Evita adjetivos grandilocuentes o no sustentados en los hechos clave. El tono debe ser profesional y objetivo, adaptado al solicitado (${data.tone}).
    3.  **Estilo Local:** Ajusta el lenguaje para que sea claro, directo y de utilidad pública para el ámbito local indicado (${data.location}).

    **Entregables Requeridos (formato Markdown):**

    **1. Comunicado de Prensa Principal (Idioma: ${primaryLang}):**
       - **Formato:** Sigue una estructura periodística profesional.
       - **Dateline:** Debe estar en la cabecera, con el formato [LUGAR, fecha]. Utiliza el estilo de fecha para ${primaryLang} (${primaryStyle}).
       - **Titular:** Atractivo y conciso.
       - **Subtítulo:** Una línea que amplíe el titular.
       - **Lead:** Un párrafo de entrada de 35 a 50 palabras que resuma lo más importante.
       - **Cuerpo:** De 3 a 5 párrafos desarrollando los hechos clave. Integra la cita de forma natural.
       - **Boilerplate:** Un párrafo final estándar "Acerca de [Nombre de la Organización]". Si no se provee un nombre, usa un placeholder como [Nombre de la Organización].
       - **Contacto:** Incluye la información de contacto proporcionada al final.

    **2. Traducción Fiel (Idioma: ${secondaryLang}):**
       - Traduce el comunicado de prensa principal de forma fiel y profesional al ${secondaryLang}.
       - Adapta el formato de la fecha al estilo correspondiente (${secondaryStyle}).

    **3. Titulares Alternativos:**
       - Genera una lista de 5 titulares alternativos para el comunicado.

    **4. Posts para Redes Sociales (si se solicitó):**
       - Genera los posts coordinados según las especificaciones.

    **5. Checklist y Metadatos:**
       - Añade un bloque final con una checklist de revisión y metadatos.

    **Estructura de Salida (Usa este formato Markdown EXACTAMENTE):**

    # Comunicado de Prensa (${options.language})
    [Contenido del comunicado en ${primaryLang}]

    ---

    # Press Release (${options.language === 'ES' ? 'EN' : 'ES'})
    [Contenido de la traducción al ${secondaryLang}]

    ---

    ## 5 Titulares Alternativos
    1.  [Titular 1]
    2.  [Titular 2]
    3.  [Titular 3]
    4.  [Titular 4]
    5.  [Titular 5]
    ${socialPostsSection}
    ---

    ## Checklist de revisión
    - [ ] Verificar datos y cifras.
    - [ ] Confirmar la exactitud de la cita y el cargo.
    - [ ] Asegurar permisos para usar nombres o imágenes.
    - [ ] Comprobar que todos los enlaces funcionan.

    ---

    ## Metadatos
    - **Palabras (comunicado principal):** [Calcula el número de palabras del comunicado principal]
    - **Tiempo de lectura estimado:** [Calcula el tiempo de lectura estimado (aprox. 200 palabras por minuto)]
    `;
};

export const generatePressRelease = async (data: FormData, options: GenerationOptions): Promise<string> => {
    const model = 'gemini-2.5-pro';
    const prompt = generatePrompt(data, options);

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
             throw new Error("La clave de API no es válida. Por favor, verifica tu configuración.");
        }
        throw new Error("No se pudo generar el contenido. Inténtalo de nuevo más tarde.");
    }
};
