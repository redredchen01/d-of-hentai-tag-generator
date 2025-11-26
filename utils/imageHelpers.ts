
/**
 * Reads the dimensions of an image file.
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return reject(new Error('Could not read file.'));
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = event.target.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compresses an image file to a specific max dimension and quality.
 */
export const compressImage = (file: File): Promise<{ file: File; base64: string }> => {
  return new Promise((resolve, reject) => {
    const MAX_DIMENSION = 1024;
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target?.result) {
        // Fallback to original if read fails in a weird way
        const originalReader = new FileReader();
        originalReader.onloadend = () => {
            resolve({ file, base64: originalReader.result as string});
        };
        originalReader.onerror = (e) => reject(e);
        originalReader.readAsDataURL(file);
        return;
      }
      const img = new Image();
      img.src = event.target.result as string;

      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          } else {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));
        
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        canvas.toBlob((blob) => {
          if (!blob) {
            const newFile = new File([], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
            resolve({ file: newFile, base64: compressedBase64 });
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve({ file: compressedFile, base64: compressedBase64 });
        }, 'image/jpeg', 0.85);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
