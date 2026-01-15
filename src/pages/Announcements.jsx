import { useState, useEffect } from "react";
import { getFile, commitFile, decodeBase64UTF8 } from "../utils/github";
import Swal from "sweetalert2";

export default function AnnouncementAdmin() {
  const [data, setData] = useState({
    active: true,
    title: { en: "Announcement", ka: "ಪ್ರಕಟಣೆ" },
    subtitle: { en: "", ka: "" },
    description: { en: "", ka: "" },
    images: [] 
  });

  const [loading, setLoading] = useState(true); 
  const [imageFiles, setImageFiles] = useState([]);

  // Load existing data once on mount
  useEffect(() => {
    const loadCurrentData = async () => {
      try {
        const file = await getFile("src/data/popupData.js");
        if (file && file.content) {
          const decoded = decodeBase64UTF8(file.content);
          const match = decoded.match(/\{[\s\S]*\}/);
          if (match) {
            const existingData = JSON.parse(match[0]);
            // Keep the images from GitHub, but CLEAR the text fields for the admin UI
            setData({
              ...existingData,
              subtitle: { en: "", ka: "" },
              description: { en: "", ka: "" }
            });
          }
        }
      } catch (err) {
        console.error("Failed to load existing announcement:", err);
      } finally {
        setLoading(false);
      }
    };
    loadCurrentData();
  }, []);

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

  const removeImage = (indexToRemove) => {
    // This removes it from the screen immediately
    const updatedImages = data.images.filter((_, index) => index !== indexToRemove);
    setData({ ...data, images: updatedImages });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Get latest cloud data to merge text if inputs are empty
      const file = await getFile("src/data/popupData.js");
      const decoded = decodeBase64UTF8(file.content);
      const match = decoded.match(/\{[\s\S]*\}/);
      const cloudData = match ? JSON.parse(match[0]) : {};

      let finalImages = [...data.images]; // Current survivors on screen
      
      // 2. Upload Multiple Images if selected
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const fileName = `popup-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
          const base64 = await toBase64(file);
          
          await commitFile({
            path: `public/assets/${fileName}`,
            content: base64,
            message: `Upload image ${i + 1}`,
            isBase64: true
          });
          finalImages.push(`/assets/${fileName}`);
        }
      }

      // 3. Merge Logic: If input is empty, use cloudData, else use new input
      const finalDataToSave = {
        active: true,
        title: cloudData.title || { en: "Announcement", ka: "ಪ್ರಕಟಣೆ" },
        subtitle: { 
          en: data.subtitle.en || cloudData.subtitle.en || "", 
          ka: data.subtitle.ka || cloudData.subtitle.ka || "" 
        },
        description: { 
          en: data.description.en || cloudData.description.en || "", 
          ka: data.description.ka || cloudData.description.ka || "" 
        },
        images: finalImages
      };

      // 4. Final check before saving
      if (!finalDataToSave.subtitle.en && finalDataToSave.images.length > 0) {
         // If there's absolutely no title in cloud or input
         setLoading(false);
         Swal.fire("English Title is required to publish", "warning");
         return;
      }

      const updatedContent = `export const popupData = ${JSON.stringify(finalDataToSave, null, 2)};`;

      await commitFile({
        path: "src/data/popupData.js",
        sha: file.sha,
        content: updatedContent,
        message: "Update announcement (Add/Remove images & text)",
        isBase64: false
      });

      // Reset form UI
      setImageFiles([]);
      setData({
        ...finalDataToSave,
        subtitle: { en: "", ka: "" },
        description: { en: "", ka: "" }
      });

      Swal.fire({
        title: 'Published! ✅',
        text: 'Deletions and additions are now permanent on the website.',
        icon: 'success',
        confirmButtonColor: '#0a4da2'
      });
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Announcement Manager</h2>
      <div style={styles.card}>
        <div style={styles.formSection}>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>English title</label>
            <input 
              style={styles.input} 
              placeholder="Enter English title..."
              value={data.subtitle.en} 
              onChange={e => setData({...data, subtitle: {...data.subtitle, en: e.target.value}})} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Kannada title</label>
            <input 
              style={styles.input} 
              placeholder="ಕನ್ನಡ ಶೀರ್ಷಿಕೆ ನಮೂದಿಸಿ..."
              value={data.subtitle.ka} 
              onChange={e => setData({...data, subtitle: {...data.subtitle, ka: e.target.value}})} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>English Description</label>
            <textarea 
              style={{...styles.input, height: '80px'}} 
              placeholder="Enter English Description..."
              value={data.description.en} 
              onChange={e => setData({...data, description: {...data.description, en: e.target.value}})} 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Kannada Description</label>
            <textarea 
              style={{...styles.input, height: '80px'}} 
              placeholder="ವಿವರಣೆಯನ್ನು ನಮೂದಿಸಿ..."
              value={data.description.ka} 
              onChange={e => setData({...data, description: {...data.description, ka: e.target.value}})} 
            />
          </div>
          
          <div style={styles.imageSection}>
            <label style={styles.label}>Upload Multiple Images</label>
            <input 
              type="file" 
              accept="image/*" 
              multiple={true} 
              onChange={e => {
                const files = Array.from(e.target.files);
                setImageFiles(files);
              }} 
            />
            <p style={{fontSize: '10px', color: '#888', marginTop: '5px'}}>
              Tip: Hold 'Ctrl' (Windows) or 'Command' (Mac) to select multiple files.
            </p>
            
            {data.images && data.images.length > 0 && (
              <div style={{marginTop: '15px'}}>
                <p style={{fontSize: '11px', color: '#666', fontWeight: 'bold'}}>Images currently in slider:</p>
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0'}}>
                  {data.images.map((img, idx) => (
                    <div key={idx} style={{position: 'relative', flexShrink: 0}}>
                      <img 
                        src={img} 
                        style={{width: '100px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd'}} 
                        onError={(e) => { e.target.src = `https://rbkvmul-website.vercel.app${img}`; }}
                      />
                      <button onClick={() => removeImage(idx)} style={styles.deleteBadge}>✕</button>
                    </div>
                  ))}
                </div>
                <p style={{fontSize: '10px', color: '#999'}}>* Click ✕ and then click "Publish" to permanently delete.</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ ...styles.saveButton, backgroundColor: loading ? "#ccc" : "#007bff" }}
        >
          {loading ? "Processing..." : "Publish Changes"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px 20px", maxWidth: "800px", margin: "auto", fontFamily: "sans-serif" },
  header: { textAlign: "center", marginBottom: "30px", color: "#333" },
  card: { background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  formSection: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#555" },
  input: { padding: "12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" },
  imageSection: { padding: "15px", border: "1px dashed #ccc", borderRadius: "8px" },
  saveButton: { marginTop: "25px", padding: "15px", color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", width: "100%" },
  deleteBadge: {
    position: 'absolute', top: '-5px', right: '-5px', background: '#ff4444', color: 'white',
    border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  }
};