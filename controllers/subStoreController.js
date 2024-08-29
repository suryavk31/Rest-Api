const db = require("../services/db");

async function addSubStore(req, res) {
    try {
        const { store_id, sub_store_id, phone, sub_store_owner } = req.body

        if (!store_id || !sub_store_id || !phone || !sub_store_owner) {
            return res.status(400).json({ message: "Missing Required fields" })
        }

        await db.query(
            "INSERT INTO sub_stores (store_id, sub_store_id, phone, sub_store_owner) VALUES (?, ?, ?, ?)",
            [store_id, sub_store_id, phone, sub_store_owner]
        )

        res.status(200).json({ message: "Sub Store created Successfully" })
    } catch (error) {
        console.error("Error adding Sub Store:", error);
        res.status(500).json({ message: "Failed to add Sub Store" })                
    }
}

async function updateSubStore(req, res) {
    try {
        const { id, store_id, sub_store_id, phone, sub_store_owner } = req.body;

        if ( !id || !store_id || !sub_store_id || !phone || !sub_store_owner ) {
            return res.status(400).json({ message: "Missing Required fields" })
        }
        await db.query(
            "UPDATE sub_stores SET store_id = ?, sub_store_id = ?, phone = ?, sub_store_owner = ? WHERE id = ?",
            [ store_id, sub_store_id, phone, sub_store_owner, id ]
        )
        res.status(200).json({ message: "Sub Store Updated Successfully" })
    } catch (error) {
        console.error("Error While updating Sub Store:", error);
        req.status(500).json({ message: "Failed to update Sub Store...!" })
    }
}

async function deleteSubStore(req, res) {
    try {
        const { id } = req.params
        if (!id) {
            return res.status.json({ message: "Missing Require fields" })
        }

        await db.query(
            "DELETE FROM sub_stores WHERE id = ?",
            [id]
        )
        res.status(200).json({ message: "Sub Store deleted successfully" })

    } catch (error) {
        console.error("Error while deleting Sub Store:", error);
        res.status(500).json({ message: "Failed to delete Store" })
    }
}


async function getAllStore(req, res) {
    const query = 'SELECT * FROM sub_stores';

    try {
        const stores = await db.query(query);
        res.json(stores);
    } catch (error) {
        console.error(`Error while fetching sub stores: ${error.message}`)
        res.status(500).json({ error: "Failed to fetch sub stores" })
    }
}


async function getSubStoreByStoreId(req, res) {  
    
    try {
        const { store_id } = req.params
    if (!store_id) {
        return res.status(400).json({ message: "Missing Store ID" })
    }
    const stores = await db.query( "SELECT * FROM sub_stores WHERE store_id = ?", [store_id] );
    if (stores.length === 0) {
        return res.status(404).json({ message: "No Sub Stores found for the store" })
    }
    res.json(stores);
    } catch (error) {
        console.error("Error fetching Sub Stores by store_id:", error);
        res.status(500).json({ message: "Failed to fetch Sub Stores" })
    }
}

module.exports = { addSubStore, updateSubStore, deleteSubStore, getAllStore, getSubStoreByStoreId }