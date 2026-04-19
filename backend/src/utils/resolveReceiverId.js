const mongoose = require('mongoose');
const Car = require('../models/Car');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

const normalizeId = (value) => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value._id) {
    return value._id.toString();
  }
  return String(value);
};

/**
 * Resolve receiverId (listing owner) from entityType/entityId.
 * Returns an object { receiverId } where receiverId is a string.
 * Returns null if entityType/entityId is not provided.
 * Throws an Error with message for invalid/missing entity.
 */
const resolveReceiverId = async ({ entityType, entityId }) => {
  if (!entityType || !entityId) {
    return null;
  }

  const entityIdStr = normalizeId(entityId);
  if (!mongoose.Types.ObjectId.isValid(entityIdStr)) {
    const err = new Error('Invalid entityId');
    err.statusCode = 400;
    throw err;
  }

  if (entityType === 'ride') {
    const ride = await Ride.findById(entityIdStr).select('driver');
    if (!ride) {
      const err = new Error('Ride not found');
      err.statusCode = 404;
      throw err;
    }
    return { receiverId: normalizeId(ride.driver) };
  }

  if (entityType === 'car') {
    const car = await Car.findById(entityIdStr).select('userId');
    if (!car) {
      const err = new Error('Car not found');
      err.statusCode = 404;
      throw err;
    }
    return { receiverId: normalizeId(car.userId) };
  }

  if (entityType === 'driver') {
    const driver = await Driver.findById(entityIdStr).select('userId');
    if (!driver) {
      const err = new Error('Driver not found');
      err.statusCode = 404;
      throw err;
    }
    return { receiverId: normalizeId(driver.userId) };
  }

  const err = new Error('Invalid entityType. Must be ride, car, or driver');
  err.statusCode = 400;
  throw err;
};

module.exports = {
  resolveReceiverId,
  normalizeId,
};

