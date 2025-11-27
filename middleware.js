const Listing = require("./models/listing");
const Review = require("./models/review");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    //Redirect url save
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in to create listing!");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);

  if (!listing.owner._id.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the owner of the listing");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

module.exports.validateListing = (req, res, next) => {
  // Normalize incoming body so we always validate { listing: { ... } }
  let payload = req.body || {};

  // If client sent bracketed form fields like listing[title], convert them
  if (!payload.listing) {
    const fromBrackets = {};
    for (const key of Object.keys(payload)) {
      const m = key.match(/^listing\[(.+)\]$/); // matches listing[title]
      if (m) fromBrackets[m[1]] = payload[key];
    }
    if (Object.keys(fromBrackets).length) {
      payload = { listing: fromBrackets };
    }
  }

  // If client sent a flat JSON body (title, description, ...) convert to wrapper
  if (!payload.listing && payload.title) {
    payload = { listing: payload };
  }

  const { error, value } = listingSchema.validate(payload, {
    abortEarly: false,
  });
  if (error) {
    // Build a readable message from Joi details (e.g. "listing is required")
    const msg = error.details.map((d) => d.message).join(", ");
    return next(new ExpressError(400, msg));
  }

  // Attach normalized and validated data so downstream uses the safe shape
  req.normalizedListing = value.listing;
  next();
};

module.exports.validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.isreviewAuthor = async (req, res, next) => {
  let { id, reviewId } = req.params;
  let review = await Review.findById(reviewId);

  if (!review.author._id.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the author of this review");
    return res.redirect(`/listings/${id}`);
  }
  next();
};