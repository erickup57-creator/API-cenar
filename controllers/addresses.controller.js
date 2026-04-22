import Addresses from "../models/AddressModel.js";

function buildAddressPayload(body) {
  return {
    label: body.label,
    street: body.street,
    sector: body.sector,
    city: body.city,
    reference: body.reference
  };
}

export async function GetMyAddresses(req, res, next) {
  try {
    const addresses = await Addresses.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(addresses);
  } catch (error) {
    return next(error);
  }
}

export async function GetAddressById(req, res, next) {
  try {
    const address = await Addresses.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!address) {
      const error = new Error("Direccion no encontrada.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json(address);
  } catch (error) {
    return next(error);
  }
}

export async function CreateAddress(req, res, next) {
  try {
    const address = await Addresses.create({
      ...buildAddressPayload(req.body),
      userId: req.user.id
    });

    return res.status(201).json(address);
  } catch (error) {
    return next(error);
  }
}

export async function UpdateAddress(req, res, next) {
  try {
    const address = await Addresses.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      buildAddressPayload(req.body),
      {
        new: true,
        runValidators: true
      }
    );

    if (!address) {
      const error = new Error("Direccion no encontrada.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json(address);
  } catch (error) {
    return next(error);
  }
}

export async function DeleteAddress(req, res, next) {
  try {
    const address = await Addresses.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!address) {
      const error = new Error("Direccion no encontrada.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
