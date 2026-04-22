import { Roles } from "../utils/enums/roles.js";


export function getDashboard(req, res) {

  const user = req.session?.user ?? null;

     switch (user.role) {
        case Roles.CLIENT:
          return res.redirect("/client/dashboard");
        case Roles.DELIVERY:
          return res.redirect("/delivery/dashboard");
        case Roles.COMMERCE:
          return res.redirect("/commerce/dashboard");
        case Roles.ADMIN:
          return res.redirect("/AdminDashboard");
        default:
          req.flash("errors", "user role is not recognized.");
          return res.redirect("/user/login");
      }
}
