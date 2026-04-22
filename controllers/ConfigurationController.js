import Configuration from "../models/ConfigurationModel.js";

//#region GET

export async function getConfigurations(req, res, next) {
  try {
    const result = await Configuration.find({}).lean();
    const configurations = result || [];

    res.render("configurations/Index", {
      configurationList: configurations,
      hasconfiguration: configurations.length > 0,
      "layout" : "admin-layout",
      "page-title": "Configuration Home",
    });
  } catch (err) {
    console.error("Error fetching configuration:", err);
    req.flash("error", "An error occurred while fetching the configuration.");
    res.redirect("/configurations");
  }
}

//#endregion

//#region SAVE

export async function getConfigurationSave(req, res, next) {
  try {
    res.render("configurations/Save", {
      editMode: false,
      layout: "admin-layout",
      "page-title": "Add Configuration",
    });
  } catch (err) {
    console.error("Error loading save view:", err);
    req.flash("error", "An error occurred while loading the form.");
    res.redirect("/configurations");
  }
}

export async function postConfigurationSave(req, res, next) {
  const { itbis } = req.body;

  try {
    await Configuration.create({ itbis });

    req.flash("success", "Configuration saved successfully.");
    res.redirect("/configurations");
  } catch (err) {
    console.error("Error saving configuration:", err);

    req.flash("error", "An error occurred while saving the configuration.");
    res.redirect("/configurations/save");
  }
}

//#endregion

//#region UPDATE

export async function getConfigurationEdit(req, res, next) {
  const id = req.params.id;

  try {
    const configuration = await Configuration.findOne({ _id: id }).lean();

    if (!configuration) {
      req.flash("error", "Configuration not found.");
      return res.redirect("/configurations");
    }

    res.render("configurations/Save", {
      editMode: true,
      configuration,
      layout: "admin-layout",
      "page-title": "Edit Configuration",
    });
  } catch (err) {
    console.error("Error fetching configuration:", err);

    req.flash("error", "An error occurred while fetching the configuration.");
    res.redirect("/configurations");
  }
}

export async function postConfigurationEdit(req, res, next) {
  const { id, itbis } = req.body;

  try {
    const configuration = await Configuration.findById(id);

    if (!configuration) {
      req.flash("error", "Configuration not found.");
      return res.redirect("/configurations");
    }

    await Configuration.findByIdAndUpdate(id, { itbis });

    req.flash("success", "Configuration updated successfully.");
    res.redirect("/configurations");
  } catch (err) {
    console.error("Error updating configuration:", err);

    req.flash("error", "An error occurred while updating the configuration.");
    res.redirect(`/configurations/edit/${id}`);
  }
}

//#endregion
