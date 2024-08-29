const db = require("./db");

async function getAllBanners() {
  const rows = await db.query("SELECT * FROM banners");
  return rows;
}

async function createBanner(banner) {
  const { banner_img } = banner;
  const query = "INSERT INTO banners (banner_img) VALUES (?)";
  await db.query(query, [banner_img]);
  return { message: "Banner created successfully" };
}

async function bulkCreateBanners(banners) {
    if (banners.length === 0) {
      return { message: "No Banners to create" };
    }
  
    const query =
      "INSERT INTO banners (banner_img) VALUES " +
      banners.map(() => "(?)").join(",");
  
    const values = banners.reduce((acc, banner) => {
      acc.push(banner.banner_img);
      return acc;
    }, []);
  
    try {
      await db.query(query, values);
      return { message: "Banners created successfully" };
    } catch (error) {
      console.error("Error in bulkCreateBanners:", error);
      throw error; // Propagate the error to the caller
    }
  }


async function getBannerById(bannerId) {
  const rows = await db.query("SELECT * FROM banners WHERE banner_id = ?", [bannerId]);
  return rows[0];
}

async function updateBanner(bannerId, banner) {
  const { banner_img } = banner;
  const query = "UPDATE banners SET banner_img=? WHERE banner_id=?";
  await db.query(query, [banner_img, bannerId]);
  return { message: "Banner updated successfully" };
}

async function deleteBanner(bannerId) {
  await db.query("DELETE FROM banners WHERE banner_id=?", [bannerId]);
  return { message: "Banner deleted successfully" };
}

module.exports = {
  getAllBanners,
  createBanner,
  getBannerById,
  updateBanner,
  deleteBanner,
  bulkCreateBanners
};
