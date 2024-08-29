const db = require("./db");
const xlsx = require("xlsx");

async function getAllCategories() {
  const rows = await db.query("SELECT * FROM categories");
  return rows;
}

async function createCategory(category) {
  const { category_name, category_img } = category;
  const query = "INSERT INTO categories (category_name, category_img) VALUES (?, ?)";
  await db.query(query, [category_name, category_img]);
  return { message: "Category created successfully" };
}

async function bulkCreateCategories(categories) {
  if (categories.length === 0) {
    return { message: "No categories to create" };
  }

  const query =
    "INSERT INTO categories (category_name, category_img) VALUES " +
    categories.map(() => "(?, ?)").join(", ");

  const values = categories.reduce((acc, category) => {
    acc.push(category.category_name, category.category_img);
    return acc;
  }, []);

  try {
    await db.query(query, values);
    return { message: "Categories created successfully" };
  } catch (error) {
    console.error("Error in bulkCreateCategories:", error);
    throw error; // Propagate the error to the caller
  }
}



async function getCategoryById(categoryId) {
  const rows = await db.query("SELECT * FROM categories WHERE category_id = ?", [categoryId]);
  return rows[0];
}

async function updateCategory(categoryId, category) {
  const { category_name, category_img } = category;
  const query = "UPDATE categories SET category_name=?, category_img=? WHERE category_id=?";
  await db.query(query, [category_name, category_img, categoryId]);
  return { message: "Category updated successfully" };
}

async function deleteCategory(categoryId) {
  await db.query("DELETE FROM categories WHERE category_id=?", [categoryId]);
  return { message: "Category deleted successfully" };
}

async function exportCategoriesToExcel() {
  try {
    const rows = await db.query("SELECT * FROM categories");
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, "categories");
    const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    return excelBuffer;
  } catch (error) {
    console.error(`Error while export Categories`, error.message);
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  bulkCreateCategories,
  exportCategoriesToExcel
};
