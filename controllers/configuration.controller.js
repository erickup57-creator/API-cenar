import Configuration from "../models/ConfigurationModel.js";

export const getConfigurations = async (req, res, next) => {
  try {
    let itbisConfiguration = await Configuration.findOne({ key: "ITBIS" });

    if (!itbisConfiguration) {
      itbisConfiguration = await Configuration.create({
        key: "ITBIS",
        value: "18"
      });
    }

    const configurations = await Configuration.find().lean();

    return res.status(200).json({
      success: true,
      data: configurations
    });
  } catch (error) {
    next(error);
  }
};


export const getConfigurationByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const normalizedKey = key.toUpperCase();

    let configuration = await Configuration.findOne({
      key: normalizedKey
    });

    if (!configuration && normalizedKey === "ITBIS") {
      configuration = await Configuration.create({
        key: "ITBIS",
        value: "18"
      });
    }

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: configuration
    });
  } catch (error) {
    next(error);
  }
};

export const updateConfiguration = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const normalizedKey = key.toUpperCase();

    let configuration = await Configuration.findOne({
      key: normalizedKey
    });

    if (!configuration && normalizedKey === "ITBIS") {
      configuration = await Configuration.create({
        key: "ITBIS",
        value: "18"
      });
    }

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found"
      });
    }

    if (normalizedKey === "ITBIS") {
      const numericValue = Number(value);

      if (isNaN(numericValue)) {
        return res.status(400).json({
          success: false,
          message: "ITBIS must be numeric"
        });
      }

      if (numericValue < 0 || numericValue > 100) {
        return res.status(400).json({
          success: false,
          message: "ITBIS must be between 0 and 100"
        });
      }
    }

    configuration.value = value;
    await configuration.save();

    return res.status(200).json({
      success: true,
      message: "Configuration updated successfully",
      data: configuration
    });
  } catch (error) {
    next(error);
  }
};