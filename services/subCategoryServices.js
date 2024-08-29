const db = require("./db");
const xlsx = require("xlsx") 

async function getAllSubCategories() {
  const rows = await db.query("SELECT * FROM sub_categories");
  return rows;
}

async function createSubCategory(subCategory) {
  const { sub_category_name, sub_category_img } = subCategory;
  const query = "INSERT INTO sub_categories (sub_category_name, sub_category_img) VALUES (?, ?, ?)";
  await db.query(query, [sub_category_name, sub_category_img]);
  return { message: "Sub-category created successfully" };
}

async function getSubCategoryById(subCategoryId) {
  const rows = await db.query("SELECT * FROM sub_categories WHERE sub_category_id = ?", [subCategoryId]);
  return rows[0];
}

async function bulkCreateSubCategories(subCategories) {
  if (subCategories.length === 0) {
    return { message: "No sub-categories to create" };
  }

  const query = "INSERT INTO sub_categories (sub_category_name, category_name, sub_category_img) VALUES " +
    subCategories.map(() => "(?, ?, ?)").join(", ");
  
  const values = subCategories.reduce((acc, subCategory) => {
    acc.push(subCategory.sub_category_name, subCategory.category_name, subCategory.sub_category_img);
    return acc;
  }, []);

  await db.query(query, values);
  return { message: "Sub-categories created successfully" };
}

async function updateSubCategory(subCategoryId, subCategory) {
  const { sub_category_name, category_name, sub_category_img } = subCategory;
  const query = "UPDATE sub_categories SET sub_category_name=?, category_name=?, sub_category_img=? WHERE sub_category_id=?";
  await db.query(query, [sub_category_name, category_name, sub_category_img, subCategoryId]);
  return { message: "Sub-category updated successfully" };
}

async function deleteSubCategory(subCategoryId) {
  await db.query("DELETE FROM sub_categories WHERE sub_category_id=?", [subCategoryId]);
  return { message: "Sub-category deleted successfully" };
}

async function getSubCategoriesByCategoryName(categoryName) {
  const query = "SELECT * FROM sub_categories WHERE category_name=?";
  const rows = await db.query(query, [categoryName]);
  return rows;
}

async function exportSubCategoriesToExcel() {
  try {
    const rows = await db.query("SELECT * FROM sub_categories");
    const worksheet = xlsx.utils.json_to_sheet(rows)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, "subCategories");
    const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    return excelBuffer;
  } catch (error) {
    console.error(`Error while exporting sub categories to excel`, error.message);    
  }
}

module.exports = {
  getAllSubCategories,
  createSubCategory,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  bulkCreateSubCategories,
  getSubCategoriesByCategoryName,
  exportSubCategoriesToExcel
};
