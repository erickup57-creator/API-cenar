import multer from "multer";
import path from "path";
import { mkdirSync } from "node:fs";
import { v4 as guidV4 } from "uuid"; //generar los nombres randon
import { projectRoot } from "../utils/Paths.js";

function buildStorage(relativePath) {
  return multer.diskStorage({
    //en qe carpeta se va a guardar la imagen
    destination: (req, file, cb) => {
      const destinationPath = path.join(projectRoot, ...relativePath);
      mkdirSync(destinationPath, { recursive: true });
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      const fileName = `${guidV4()}-${file.originalname}`;
      cb(null, fileName);
    }
  });
}

const profileImageStorage = buildStorage(["public", "Images", "profileImages"]);
const productImageStorage = buildStorage(["public", "Images", "products"]);
const commerceTypeIconStorage = buildStorage(["public", "Images", "commerceTypeIcons"]);

//se resive un solo archivo dond en el formularo se llama profileImage
export const uploadProfileImage = multer({ storage: profileImageStorage }).single("profileImage");
export const uploadProductImage = multer({ storage: productImageStorage }).single("productImage");
export const uploadCommerceTypeIcon = multer({ storage: commerceTypeIconStorage }).single("icon");
