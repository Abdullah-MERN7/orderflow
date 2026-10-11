export const decodeCursor = (cursor) => {
  try {
    const decoded = Buffer.from(cursor, "base64").toString();

    const { createdAt, id } = JSON.parse(decoded);

    if (!createdAt || !id) {
      throw new Error("Invalid cursor");
    }

    return {
      createdAt: new Date(createdAt),
      id,
    };
  } catch (error) {
    throw new Error("Invalid cursor");
  }
};