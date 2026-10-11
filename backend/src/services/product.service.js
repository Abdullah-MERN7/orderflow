import Product from "../models/product.model.js";
import { decodeCursor } from "../utils/cursor.js";

export const createProduct = async (data) => {
  const product = await Product.create(data);

  return product;
};

export const getProducts = async (limit = 20, cursor, category, search) => {
  const query = {};

  if (category) {
    query.category = category;
  }

  if (search) {
  query.name = {
    $regex: search,
    $options: "i",
  };
}

  if (cursor) {
    const { createdAt, id } = decodeCursor(cursor);

    query.$or = [
      { createdAt: { $lt: createdAt } },
      {
        createdAt,
        _id: { $lt: id },
      },
    ];
  }

  const products = await Product.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasNextPage = products.length > limit;

  if (hasNextPage) {
    products.pop();
  }

  const lastProduct = products[products.length - 1];

  const nextCursor =
    hasNextPage && lastProduct
      ? Buffer.from(
          JSON.stringify({
            createdAt: lastProduct.createdAt,
            id: lastProduct._id,
          }),
        ).toString("base64")
      : null;

  return {
    products,
    pagination: {
      nextCursor,
      hasNextPage,
    },
  };
};

export const getProductById = async (id) => {
  const product = await Product.findById(id);

  return product;
};

export const updateProduct = async (id, data) => {
  const product = await Product.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);

  return product;
};
