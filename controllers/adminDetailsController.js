const db = require("../services/db");

async function createAdminDetails(req, res) {
    try {
        const { phone, email, website, logo, invoice_logo, company_name, contact_number, gst_number } = req.body;
        if (!phone || !email || !website || !logo || !invoice_logo || !company_name || !contact_number || !gst_number) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        await db.query(
            "INSERT INTO admin_details (phone, email, website, logo, invoice_logo, company_name, contact_number, gst_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [phone, email, website, logo, invoice_logo, company_name, contact_number, gst_number]
        );
        res.status(200).json({ message: "Admin Details created successfully" });
    } catch (error) {
        console.error("Error creating Admin details:", error);
        res.status(500).json({ message: "Failed to add Admin details" });
    }
}

async function updateAdminDetails(req, res) {
    try {
        const { id } = req.query;  // Extract id from query params
        const { phone, email, website, logo, invoice_logo, company_name, contact_number, gst_number } = req.body;

        if (!id || !phone || !email || !website || !logo || !invoice_logo || !company_name || !contact_number || !gst_number) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Use pool.execute to avoid unnecessary result processing
        const [result] = await db.query(
            "UPDATE admin_details SET phone = ?, email = ?, website = ?, logo = ?, invoice_logo = ?, company_name = ?, contact_number = ?, gst_number = ? WHERE id = ?",
            [phone, email, website, logo, invoice_logo, company_name, contact_number, gst_number, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Admin details not found" });
        }

        res.status(200).json({ message: "Admin details updated successfully" });
    } catch (error) {
        console.error("Error updating Admin details:", error);
        res.status(500).json({ message: "Failed to update Admin details" });
    }
}



async function getAllAdminDetails(req, res) {
    const query = 'SELECT * FROM admin_details';

    try {
        const [details] = await db.query(query);
        res.json(details);
    } catch (error) {
        console.error(`Error while fetching admin details: ${error.message}`);
        res.status(500).json({ error: "Failed to fetch admin details" });
    }
}

module.exports = {
    getAllAdminDetails,
    createAdminDetails,
    updateAdminDetails
};
