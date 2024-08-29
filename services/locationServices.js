const db = require("./db");

async function getAllLocations() {
    const rows = await db.query("SELECT * FROM locations")
    return rows;
}

async function createLocation(location) {
    const { location_name, city_name, store_id, pin_codes } = location;
    const query = "INSERT INTO locations (location_name, city_name, store_id, pin_code) VALUE (?, ?, ?, ?)";
    await db.query(query, [location_name, city_name, store_id, pin_codes]);
    return { message: "Location Created successfully" };
}

async function addBulkLocations(locations) {
    if (locations.length === 0) {
        return { message: "No locations to create" };
    }

    const query = "INSERT INTO locations (location_name, city_name, store_id, pin_codes) VALUES ?";
    const values = locations.map(location => [location.location_name, location.city_name, location.store_id, location.pin_codes]);

    try {
        await db.query(query, [values]);
        return { message: "Locations created successfully" };
    } catch (error) {
        console.error("Error in addBulkLocations:", error);
        throw error;
    }
}

async function getLocationById(locationId) {
    const rows = await db.query("SELECT * FROM locations WHERE id = ?", [locationId]);
    return rows[0];
}

async function updateLocation(locationId, location) {
    const { location_name, city_name, store_id, pin_codes } = location;
    const query = "UPDATE locations SET location_name=?, city_name=?, store_id=?, pin_codes=? WHERE id=?";
    await db.query(query, [location_name, city_name, store_id, pin_codes, locationId]);
    return { message: "Location updated successfully" };
}

async function deleteLocation(locationId) {
    await db.query("DELETE FROM locations WHERE id=?", [locationId]);
    return { message: "Location deleted successfully" };
}

async function bulkCreateLocations(locations) {
    if (locations.length === 0) {
        return { message: "No locations to create" };
    }

    const query = "INSERT INTO locations (location_name, city_name, store_id, pin_codes) VALUE" + locations.map(() => "(?, ?, ?, ?)").join(", ");

    const values = locations.reduce((acc, loc) => {
        acc.push(loc.location_name, loc.city_name || null, loc.store_id, loc.pin_codes || null);
        return acc;
    }, []);

    try {
        await db.query(query, values);
        return { message: "Location created Successfully" };
    } catch (error) {
        console.error("Error in bulkCreateLocations:", error);
        throw error;
    }
}

async function getLocationByPostalCode(postalCode) {
    // Fetch the location by postal code
    const rows = await db.query("SELECT * FROM locations WHERE pin_codes = ?", [postalCode]);

    if (rows.length > 0) {
        // Return the found location
        return rows[0];
    } else {
        // Fallback to default location
        const defaultLocation = await db.query("SELECT * FROM locations WHERE id = 14");
        return defaultLocation[0];
    }
}

module.exports = {
    getAllLocations,
    createLocation,
    addBulkLocations,
    getLocationById,
    updateLocation,
    deleteLocation,
    bulkCreateLocations,
    getLocationByPostalCode
};