const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const Listing = require("../models/listing.js");

const validateListing = (req, res, next) => {
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

//INDEX ROUTE
router.get(
  "/",
  wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  })
);

//NEW ROUTE
router.get("/new", (req, res) => {
  res.render("listings/new.ejs");
});

//SHOW ROUTE
router.get(
  "/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs", { listing });
  })
);

//CREATE ROUTE
// router.post(
//   "/listings",
//   wrapAsync(async (req, res, next) => {
//     const newListing = new Listing(req.body.listing);
//     await newListing.save();
//     res.redirect("/listings");
//   })
// );

router.post(
  "/",
  validateListing,
  wrapAsync(async (req, res) => {
    const newListing = new Listing(req.normalizedListing);
    await newListing.save();
    res.redirect("/listings");
  })
);

//EDIT ROUTE
router.get(
  "/:id/edit",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  })
);

//UPDATE ROUTE
// app.put(
//   "/listings/:id", validateListing,
//   wrapAsync(async (req, res) => {
//     // if (!req.body.listing) {
//     //   throw new ExpressError(400, "Send valid data for the listings");
//     // }
//     let { id } = req.params;
//     await Listing.findByIdAndUpdate(id, { ...req.body.listing });
//     res.redirect(`/listings/${id}`);
//   })
// );

// app.put(
//   "/listings/:id",
//   validateListing,
//   wrapAsync(async (req, res) => {
//     const { id } = req.params;
//     await Listing.findByIdAndUpdate(id, { ...req.normalizedListing });
//     res.redirect(`/listings/${id}`);
//   })
// );

router.put(
  "/:id",
  validateListing,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    // Keep old image if user leaves field blank
    const updatedData = { ...req.normalizedListing };
    if (!updatedData.image) {
      updatedData.image = listing.image;
    }

    await Listing.findByIdAndUpdate(id, updatedData);
    res.redirect(`/listings/${id}`);
  })
);

//DELETE ROUTE
router.delete(
  "/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");
  })
);

module.exports = router;
