const db = require("./db");
const xlsx = require("xlsx");

async function getAllSubSubCategories() {
  const rows = await db.query("SELECT * FROM sub_sub_categories");
  return rows;
}

async function createSubSubCategory(subSubCategory) {
  const { sub_sub_category_name, sub_category_name, sub_sub_category_img } = subSubCategory;
  const query = "INSERT INTO sub_sub_categories (sub_sub_category_name, sub_category_name, sub_sub_category_img) VALUES (?, ?, ?)";
  await db.query(query, [sub_sub_category_name, sub_category_name, sub_sub_category_img]);
  return { message: "Sub-sub-category created successfully" };
}

async function getSubSubCategoryById(subSubCategoryId) {
  const rows = await db.query("SELECT * FROM sub_sub_categories WHERE sub_sub_category_id = ?", [subSubCategoryId]);
  return rows[0];
}

async function bulkCreateSubSubCategories(subSubCategories) {
  if (subSubCategories.length === 0) {
    return { message: "No sub-sub-categories to create" };
  }

  const query = "INSERT INTO sub_sub_categories (sub_sub_category_name, sub_category_name, sub_sub_category_img) VALUES " +
    subSubCategories.map(() => "(?, ?, ?)").join(", ");
  
  const values = subSubCategories.reduce((acc, subSubCategory) => {
    acc.push(subSubCategory.sub_sub_category_name, subSubCategory.sub_category_name, subSubCategory.sub_sub_category_img);
    return acc;
  }, []);

  await db.query(query, values);
  return { message: "Sub-sub-categories created successfully" };
}

async function updateSubSubCategory(subSubCategoryId, subSubCategory) {
  const { sub_sub_category_name, sub_category_name, sub_sub_category_img } = subSubCategory;
  const query = "UPDATE sub_sub_categories SET sub_sub_category_name=?, sub_category_name=?, sub_sub_category_img=? WHERE sub_sub_category_id=?";
  await db.query(query, [sub_sub_category_name, sub_sub_category_img, sub_category_name, subSubCategoryId]);
  return { message: "Sub-sub-category updated successfully" };
}

async function deleteSubSubCategory(subSubCategoryId) {
  await db.query("DELETE FROM sub_sub_categories WHERE sub_sub_category_id=?", [subSubCategoryId]);
  return { message: "Sub-sub-category deleted successfully" };
}

async function getSubSubCategoryBySubCategoryName(subCategoryName) {
  const query = "SELECT * FROM sub_sub_categories WHERE sub_category_name=?"
  const rows = await db.query(query, [subCategoryName]);
  return rows;
}

async function exportSubSubCategoriesToExcel() {
  try {
    const rows = await db.query("SELECT * FROM sub_sub_categories");
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "SubSubCategories");
    const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    return excelBuffer;
  } catch (error) {
    console.error("Error exporting sub-sub-categories to Excel:", error);
    throw error;
  }
}
module.exports = {
  getAllSubSubCategories,
  createSubSubCategory,
  getSubSubCategoryById,
  updateSubSubCategory,
  deleteSubSubCategory,
  bulkCreateSubSubCategories,
  getSubSubCategoryBySubCategoryName,
  exportSubSubCategoriesToExcel
};
