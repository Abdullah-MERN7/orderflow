import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  description: Joi.string().trim().min(5).max(500).required(),

  price: Joi.number().min(0).required(),

  stock: Joi.number().integer().min(0).required(),

  category: Joi.string().trim().min(2).max(50).required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().min(5).max(500),
  price: Joi.number().min(0),
  stock: Joi.number().integer().min(0),
  category: Joi.string().trim().min(2).max(50),
}).min(1);