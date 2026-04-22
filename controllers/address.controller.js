import Addresses from "../models/AddressModel.js";

export async function getAddressesByUser(userId) {
  return await Addresses.find({ userId }).sort({ createdAt: -1 }).lean();
}

function getClientViewModel(req, title) {
  return {
    layout: "client-layout",
    title,
    user: req.session?.user ?? null
  };
}

export async function GetCreate(req, res, next) {
  return res.render("client/addresses/save", {
    ...getClientViewModel(req, "Nueva direccion"),
    editMode: false,
    formData: {
      name: "",
      description: ""
    },
    errors: req.flash("errors"),
    success: req.flash("success")
  });
}

export async function PostCreate(req, res, next) {
  const { Name, Description } = req.body;

  try {
    await Addresses.create({
      name: Name,
      description: Description,
      userId: req.session.user._id
    });

    req.flash("success", "Direccion creada exitosamente");
    return res.redirect("/client/addresses");
  } catch (err) {
    console.error("Error creating address:", err);
    req.flash("errors", "Error al crear la direccion");
    return res.redirect("/address/create");
  }
}

export async function GetEdit(req, res, next) {
  const { addressId } = req.params;

  try {
    const address = await Addresses.findOne({
      _id: addressId,
      userId: req.session.user._id
    }).lean();

    if (!address) {
      req.flash("errors", "Direccion no encontrada");
      return res.redirect("/client/addresses");
    }

    return res.render("client/addresses/save", {
      ...getClientViewModel(req, `Editar direccion ${address.name}`),
      editMode: true,
      address,
      formData: {
        name: address.name,
        description: address.description,
        AddressId: address._id
      },
      errors: req.flash("errors"),
      success: req.flash("success")
    });
  } catch (err) {
    console.error("Error fetching address:", err);
    req.flash("errors", "Error al obtener la direccion");
    return res.redirect("/client/addresses");
  }
}

export async function PostEdit(req, res, next) {
  const { Name, Description, AddressId } = req.body;

  try {
    const address = await Addresses.findOne({
      _id: AddressId,
      userId: req.session.user._id
    }).lean();

    if (!address) {
      req.flash("errors", "Direccion no encontrada");
      return res.redirect("/client/addresses");
    }

    await Addresses.findByIdAndUpdate(AddressId, {
      name: Name,
      description: Description
    });

    req.flash("success", "Direccion actualizada exitosamente");
    return res.redirect("/client/addresses");
  } catch (err) {
    console.error("Error updating address:", err);
    req.flash("errors", "Error al actualizar la direccion");
    return res.redirect(AddressId ? `/address/edit/${AddressId}` : "/client/addresses");
  }
}

export async function Delete(req, res, next) {
  const { AddressId } = req.body;

  try {
    const address = await Addresses.findOne({
      _id: AddressId,
      userId: req.session.user._id
    }).lean();

    if (!address) {
      req.flash("errors", "Direccion no encontrada");
      return res.redirect("/client/addresses");
    }

    await Addresses.deleteOne({ _id: AddressId, userId: req.session.user._id });

    req.flash("success", "Direccion eliminada exitosamente");
    return res.redirect("/client/addresses");
  } catch (err) {
    console.error("Error deleting address:", err);
    req.flash("errors", "Error al eliminar la direccion");
    return res.redirect("/client/addresses");
  }
}
