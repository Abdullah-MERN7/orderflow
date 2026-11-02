import Joi from "joi";

export const createOrderSchema = Joi.object({
  orderItems: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().hex().length(24).required().messages({
          "string.length": "Invalid Product ID format",
        }),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  shippingAddress: Joi.object({
    address: Joi.string().trim().required(),
    city: Joi.string().trim().required(),
    postalCode: Joi.string().trim().required(),
    country: Joi.string().trim().required(),
  }).required(),
  paymentMethod: Joi.string().valid("COD", "Card").default("COD"),
});