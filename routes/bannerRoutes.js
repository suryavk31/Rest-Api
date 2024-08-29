const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const router = express.Router();
const services = require("../services/bannerServices");

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now());
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        cb(null, true);
    } 
}).single('File');

router.get("/", async (req, res, next) => {
  try {
    const banners = await services.getAllBanners();
    res.json(banners);
  } catch (error) {
    console.error(`Error while getting banners`, error.message);
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const bannerId = parseInt(req.params.id);

    if (isNaN(bannerId)) {
      return res.status(400).json({ error: 'Invalid bannerId' });
    }

    const banner = await services.getBannerById(bannerId);
    res.json(banner);
  } catch (error) {
    console.error('Error while fetching banner by ID:', error);
    next(error);
  }
});

router.post('/', async function(req, res, next) {
  try {
      res.json(await services.createBanner(req.body));
  } catch (error) {
      console.error(`Error while creating banner`, error.message);
      next(error);
  }
});

router.put('/:id', async function(req, res, next) {
  try {
      res.json(await services.updateBanner(req.params.id, req.body));
  } catch (error) {
      console.error(`Error while updating banner`, error.message);
      next(error);
  }
});

router.delete('/:id', async function(req, res, next) {
  try {
    res.json(await services.deleteBanner(req.params.id));
  } catch (error) {
    console.error(`Error while deleting banner`, error.message);
    next(error);
  }
});

router.post('/upload', function (req, res, next) {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to upload file', details: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const banners = xlsx.utils.sheet_to_json(sheet);

      const validBanners = banners.filter(banner => banner.banner_img);

      if (validBanners.length > 0) {
        await services.bulkCreateBanners(validBanners);
        res.json({ message: 'Banners uploaded successfully', Banners: validBanners });
      } else {
        res.status(400).json({ error: 'No valid banners found in the uploaded file' });
      }

      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

module.exports = router;
