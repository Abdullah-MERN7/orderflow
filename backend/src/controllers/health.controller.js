export const healthController = (req, res) => {
  res.json({
    success: true,
    message: "OrderFlow API is running",
  });
};