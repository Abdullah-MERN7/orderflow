import dotenv from "dotenv";
import passport from "./src/config/passport.js";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 4001;

app.use(passport.initialize());

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});