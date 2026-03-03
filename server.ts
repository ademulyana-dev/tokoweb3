import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // We will name the file based on the product ID
    const productId = req.params.id;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `product_${productId}${ext}`);
  }
});

const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to upload an image for a specific product ID
  app.post("/api/upload/:id", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    // Return the URL path to the uploaded image
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  });

  // API Route to get the image URL for a product
  app.get("/api/product-image/:id", (req, res) => {
    const productId = req.params.id;
    
    // Check for common extensions
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    let found = false;
    let imageUrl = null;

    for (const ext of extensions) {
      const filename = `product_${productId}${ext}`;
      if (fs.existsSync(path.join(UPLOADS_DIR, filename))) {
        found = true;
        imageUrl = `/uploads/${filename}`;
        break;
      }
    }

    if (found) {
      res.json({ exists: true, imageUrl });
    } else {
      res.json({ exists: false });
    }
  });

  // Serve uploads directory statically
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
