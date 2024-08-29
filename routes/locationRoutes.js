const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const router = express.Router();
const services = require("../services/locationServices");


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.xlsx'); // Use Date.now() instead of Date.new()
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, res, cb) {
        cb(null, true);
    }
}).single('File');

router.get("/", async (req, res, next) => {
    try {
        const locations = await services.getAllLocations();
        res.json(locations);
    } catch (error) {
        console.error(`Error while getting locations`, error.message);
        next(error);
    }
});

router.get("/:id", async (req, res, next) => {
    try {
        const locationId = parseInt(req.params.id);

        if (isNaN(locationId)) {
            return res.status(400).json({ error: 'Invalid locationId' });
        }

        const location = await services.getLocationById(locationId);
        res.json(location);
    } catch (error) {
        console.error('Error while fetching location by ID:', error);
        next(error);
    }
});

router.post('/', async function(req, res, next) {
    try {
        res.json(await services.createLocation(req.body));
    } catch (error) {
        console.error(`Error while creating location`, error.message);
        next(error);
    }
});

router.post('/bulk', async function(req, res, next) {
    try {
        res.json(await services.addBulkLocations(req.body));
    } catch (error) {
        console.error(`Error while adding bulk locations`, error.message);
        next(error);
    }
});

router.put('/:id', async function(req, res, next) {
    try {
        res.json(await services.updateLocation(req.params.id, req.body));
    } catch (error) {
        console.error(`Error while updating location`, error.message);
        next(error);
    }
});

router.delete('/:id', async function(req, res, next) {
    try {
        res.json(await services.deleteLocation(req.params.id));
    } catch (error) {
        console.error(`Error while deleting location`, error.message);
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
  
        const locations = xlsx.utils.sheet_to_json(sheet);
  
        const validLocations = locations.filter(loc => loc.location_name && loc.store_id);
  
        if (validLocations.length > 0) {
          await services.bulkCreateLocations(validLocations);
          res.json({ message: 'Locations uploaded successfully', locations: validLocations });
        } else {
          res.status(400).json({ error: 'No valid locations found in the uploaded file' });
        }
  
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  router.get('/by-postal-code/:postalCode', async (req, res, next) => {
    try {
        const postalCode = req.params.postalCode;
        const location = await services.getLocationByPostalCode(postalCode);
        if (location) {
            res.json(location);
        } else {
            res.status(404).json({ error: 'Location not found' });
        }
    } catch (error) {
        console.error('Error while fetching location by postal code:', error);
        next(error);
    }
});

module.exports = router;
