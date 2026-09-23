// Invented content for the seed. Every reply exists in three versions:
//   good  - what the brand's standard asks for
//   weak  - not wrong, but the customer will likely write in again, or off-voice
//   bad   - puts the account at risk
// The generator picks a version per ticket and scores it accordingly, so the
// data reads like a real team: mostly fine, some drift, the odd serious miss.
//
// Placeholders: {name} customer first name, {order} order ref, {sig} specialist.

export const issueTypes = [
  { key: 'wrong_information', label: 'Wrong information', severity: 'critical',
    description: 'Told the customer something untrue about their order, product or policy.' },
  { key: 'skipped_procedure', label: 'Skipped procedure', severity: 'critical',
    description: "Didn't follow the brand's procedure, e.g. order history not checked, return offered before diagnosis." },
  { key: 'missed_question', label: 'Answered a different question', severity: 'major',
    description: 'The reply is about something other than what the customer asked.' },
  { key: 'wont_resolve', label: "Won't stop them writing in", severity: 'major',
    description: 'Technically correct, but leaves the customer without a next step.' },
  { key: 'off_brand_tone', label: 'Wrong tone for the brand', severity: 'minor',
    description: "Doesn't sound like this brand: too curt, too chatty, too formal." },
  { key: 'too_slow', label: 'Too slow', severity: 'minor',
    description: "Sent later than this brand's customers expect." },
  { key: 'too_long', label: 'Too long', severity: 'minor',
    description: 'Padding around the answer; the useful line is buried.' },
];

export const brands = [
  {
    slug: 'voltra',
    name: 'Voltra',
    orderPrefix: 'VT-',
    // Voltra customers wait hours, not minutes. Replies are longer by design.
    responseMinutes: [40, 320],
    standard: [
      'Diagnose before offering a return: half of the complaints are setup or usage.',
      'Check order history before any statement about delivery or warranty.',
      'Ask for the model and what the display shows; quote the fix, not a guess.',
      'Warm, confident, plain English. Sign off as Voltra Support.',
    ].join('\n'),
    scenarios: [
      {
        subject: "S2 won't turn on after charging",
        message: "Hi, my Voltra S2 won't turn on since yesterday. I charged it all night and nothing. I want to return it, this is ridiculous for a €600 scooter. Order {order}.",
        good: {
          body: "Hi {name},\n\nSorry, that's frustrating, especially after a full night on the charger. Before we talk returns, let's rule out the two things behind most of these:\n\n1. Hold the power button for a full 5 seconds. A short press does nothing on the S2 by design.\n2. Look at the charger light while it's plugged into the scooter. If it stays green, the connector isn't fully seated: push it in until it clicks and charge again.\n\nI can see order {order} was delivered on the 3rd, so you're well inside warranty whatever happens. If neither step works, reply with what the display shows (even if it's blank) and I'll send a replacement battery or a return label, whichever you prefer.\n\n{sig}, Voltra Support",
          note: 'Exactly the order we want: diagnosis, order history, then options. Keep this one.',
        },
        weak: {
          body: "Hi {name},\n\nSorry to hear that. Could you try holding the power button for longer? If it still doesn't work let us know.\n\nThanks,\n{sig}",
          issues: ['wont_resolve', 'off_brand_tone'],
          note: 'Right first step, but no charger check and no next step. They will write back tomorrow.',
        },
        bad: {
          body: "Hi {name},\n\nI'm sorry about that. I've gone ahead and created a return label for you, you'll receive it by email shortly. Once the scooter is back with us we'll refund you within 14 days.\n\nBest,\n{sig}",
          issues: ['skipped_procedure'],
          note: 'Straight to a return. Half of these are the 5-second hold. Diagnose first, it is the first line of the Voltra procedure.',
        },
      },
      {
        subject: 'Range is half what you advertise',
        message: 'The S2 is advertised at 40 km but I barely get 22 km before it dies. Is the battery faulty? Order {order}.',
        good: {
          body: "Hi {name},\n\nFair question. The 40 km figure is measured with a 75 kg rider at 15 km/h on flat ground at 20°C, in Eco mode. Three things usually explain a gap like yours:\n\n- Sport mode uses roughly 35% more battery than Eco.\n- Tyres below 50 psi cost a lot of range; they lose pressure over the first weeks.\n- Below 10°C, expect 20 to 30% less.\n\nCould you try one full charge in Eco at 50 psi and tell me the distance? If you're still under 24 km, the app can run a battery health test (Settings > Diagnostics) and we'll replace the pack under warranty if it flags.\n\n{sig}, Voltra Support",
          note: 'Explains the spec honestly and gives a test with a threshold. Good.',
        },
        weak: {
          body: "Hi {name},\n\nRange depends on many factors like rider weight, speed and weather, so 22 km is within normal.\n\nKind regards,\n{sig}",
          issues: ['wont_resolve'],
          note: "Not wrong, but 'within normal' with no checks will read as a brush-off. Give them the Eco + tyre test.",
        },
        bad: {
          body: "Hi {name},\n\nThat definitely sounds like a faulty battery. We'll send you a new one and you'll be back to 40 km.\n\nBest,\n{sig}",
          issues: ['wrong_information', 'skipped_procedure'],
          note: "Promised 40 km, which no rider gets in Sport mode, and shipped a €180 battery without a diagnostic. This is the kind of reply that loses the account.",
        },
      },
      {
        subject: 'Error E07 and the motor cuts out on hills',
        message: "Display says E07 and the motor cuts out halfway up the hill to my office. Happened three times this week.",
        good: {
          body: "Hi {name},\n\nE07 is the motor's overheat protection, not a fault: it cuts power so the motor doesn't damage itself. On a long climb it triggers when the scooter is working near its limit.\n\n- Use gear 2 rather than 3 on the hill; it draws less current.\n- If it trips, give it 10 minutes and it resets on its own.\n- Your S2 is on firmware 2.1. Version 2.3.1 fixes early E07 triggers, so please update it in the app first.\n\nIf you still see E07 on flat ground after the update, tell me and we'll look at the controller.\n\n{sig}, Voltra Support",
          note: 'Checked the firmware version from the order record. That is the detail I want to see.',
        },
        weak: {
          body: "Hi {name}, E07 is overheating. Let it cool down and it will work again. {sig}",
          issues: ['wont_resolve', 'off_brand_tone'],
          note: 'Correct, but three lines is the Packwell voice, not Voltra. Mention the firmware update.',
        },
        bad: {
          body: "Hi {name},\n\nE07 means the controller has failed. Please send the scooter in for repair; repairs currently take 3 to 4 weeks.\n\nRegards,\n{sig}",
          issues: ['wrong_information'],
          note: 'E07 is overheat protection. We told a customer their scooter is broken and took it off them for a month.',
        },
      },
      {
        subject: 'Where is my order?',
        message: 'I ordered an S2 Pro 9 days ago (order {order}) and still have no tracking number. What is going on?',
        good: {
          body: "Hi {name},\n\nI've checked order {order}: it left our warehouse yesterday afternoon after a stock delay on the Pro in grey, which I'm sorry nobody told you about. Tracking is SEUR 2873 1190 44, and it's due with you on Thursday.\n\nIf Thursday doesn't suit, you can change the day from the SEUR link.\n\n{sig}, Voltra Support",
          note: 'Order history checked, delay owned, tracking given. Clean.',
        },
        weak: {
          body: "Hi {name},\n\nThank you for your patience. I've checked order {order} and it shipped yesterday, tracking SEUR 2873 1190 44.\n\n{sig}, Voltra Support",
          issues: ['too_slow'],
          slow: true,
          note: 'Answer is right, but it went out a day and a half after the customer asked for the second time.',
        },
        bad: {
          body: "Hi {name},\n\nOrders usually arrive within 3 to 5 working days, so please allow a little more time. If it hasn't arrived by next week, let us know.\n\nBest,\n{sig}",
          issues: ['skipped_procedure', 'missed_question'],
          note: "Order history not opened. The order was stuck on a stock hold and we told them to wait another week. Same pattern as last month.",
        },
      },
      {
        subject: 'Front brake squeaks',
        message: 'My front brake squeals really loudly when I stop. Is that dangerous? Bought it two weeks ago.',
        good: {
          body: "Hi {name},\n\nOn a new S2 that's usually the pads bedding in, and it isn't dangerous as long as the brake stops you firmly. Two things fix most cases:\n\n1. Ten firm stops from about 15 km/h on a dry road.\n2. If it still squeals, the caliper may be slightly off-centre: loosen the two 5 mm bolts, squeeze the lever, and tighten them while holding it. Our 2-minute video: voltra.example/brake-align\n\nIf the lever feels soft or it takes longer to stop than it used to, stop riding it and tell me; that's a different problem and we'll handle it straight away.\n\n{sig}, Voltra Support",
          note: 'Answers the safety question first, then the fix, then the escalation line. Model reply.',
        },
        weak: {
          body: "Hi {name},\n\nPlease book the scooter in for a service with one of our partner workshops and they will take a look.\n\n{sig}, Voltra Support",
          issues: ['wont_resolve', 'missed_question'],
          note: 'They asked if it was dangerous. We did not say. And a workshop trip for bedding-in is overkill.',
        },
        bad: {
          body: "Hi {name}, squeaking brakes are completely normal on scooters, nothing to worry about! Enjoy the ride. {sig}",
          issues: ['wrong_information'],
          note: 'We cannot say "nothing to worry about" about brakes without asking how they stop. Safety line missing.',
        },
      },
      {
        subject: 'Return unopened scooter',
        message: "I bought an S2 as a gift but my son already got one. It's still in the sealed box. Can I return it? Order {order}.",
        good: {
          body: "Hi {name},\n\nOf course. Order {order} was delivered 11 days ago, so you're inside our 30-day window, and a sealed box means a full refund.\n\nYour prepaid label is attached. Once the courier scans it, the refund goes back to your card within 5 working days.\n\n{sig}, Voltra Support",
          note: 'No diagnosis needed for a sealed return, and the reply knew that. Fast and correct.',
        },
        weak: {
          body: "Hi {name},\n\nSorry to hear the scooter isn't right for you! Before we process a return, could you tell us what issue you're having with it? Often we can fix things remotely.\n\n{sig}, Voltra Support",
          issues: ['missed_question'],
          note: 'The diagnose-first rule is for faults, not sealed returns. Read the message.',
        },
        bad: {
          body: "Hi {name},\n\nUnfortunately returns are only accepted within 14 days of purchase, and the scooter must be unopened.\n\nRegards,\n{sig}",
          issues: ['wrong_information'],
          note: 'Our window is 30 days. We refused a valid return.',
        },
      },
    ],
  },
  {
    slug: 'packwell',
    name: 'Packwell',
    orderPrefix: 'PW-',
    // B2B buyers expect a reply within the hour.
    responseMinutes: [8, 70],
    standard: [
      'Fast and exact. Three lines is the target, five is the limit.',
      'Always quote order number, SKU and quantities back.',
      'Dispatch cut-off is 14:00 for next-day; never promise a date past it without checking stock.',
      'No pleasantries beyond one line, no emoji. Sign off with name and "Packwell Orders".',
    ].join('\n'),
    scenarios: [
      {
        subject: '2,000 more MB-40 by Friday?',
        message: 'Can we get another 2,000 of the MB-40 mailers delivered by Friday? Same address as last time. Account {order}.',
        good: {
          body: "Hi {name},\n2,000 × MB-40 are in stock. Confirm before 14:00 today and they ship tomorrow for Thursday delivery to the usual address.\nReply \"confirm\" and I'll book it on {order}.\n{sig}, Packwell Orders",
          note: 'Stock, cut-off, date, one action. This is the Packwell reply.',
        },
        weak: {
          body: "Hi {name},\n\nThank you so much for getting in touch, and it's great to hear from you again! We really appreciate your continued business with Packwell.\n\nI'm happy to let you know that we do have the MB-40 mailers in stock, and if you're able to confirm your order before our 14:00 cut-off today, we'll be able to ship them out tomorrow so that they arrive with you on Thursday.\n\nPlease don't hesitate to let me know if there's anything else I can help with!\n\nWarm regards,\n{sig}",
          issues: ['too_long', 'off_brand_tone'],
          note: "Correct, but the answer is in paragraph two. Packwell buyers read the first line and move on.",
        },
        bad: {
          body: "Hi {name}, yes no problem, they'll be with you by Friday! {sig}",
          issues: ['wrong_information', 'skipped_procedure'],
          note: 'Stock was 1,200, not 2,000. Nobody checked. We promised a date we could not hit.',
        },
      },
      {
        subject: 'Invoice quantity is wrong',
        message: 'Invoice for {order} charges us for 2,000 TP-12 tape rolls. We received 1,500. Please correct.',
        good: {
          body: "Hi {name},\nChecked {order}: delivery note confirms 1,500 × TP-12, invoiced 2,000. Corrected invoice attached; the original is voided.\nSorry for the error.\n{sig}, Packwell Orders",
          note: 'Checked the delivery note, fixed it, three lines.',
        },
        weak: {
          body: "Hi {name},\nI've passed this to our accounts team and they'll be in touch.\n{sig}, Packwell Orders",
          issues: ['wont_resolve'],
          note: 'The delivery note was one click away. Fix it, don\'t forward it.',
        },
        bad: {
          body: "Hi {name},\nThe invoice matches the order you placed for 2,000 units.\n{sig}, Packwell Orders",
          issues: ['skipped_procedure', 'wrong_information'],
          note: "Compared against the order, not the delivery. We told a customer they're wrong when we short-shipped them.",
        },
      },
      {
        subject: 'Pallet arrived crushed',
        message: 'Pallet for {order} arrived crushed, about a third of the BX-30 boxes are unusable. Photos attached.',
        good: {
          body: "Hi {name},\nThanks for the photos. 600 × BX-30 replacement dispatched today, tracking DHL 55 2019 8830; no need to return the damaged ones.\nI've logged the claim with the carrier on our side.\n{sig}, Packwell Orders",
          note: 'Replacement first, claim handled internally. Customer does nothing.',
        },
        weak: {
          body: "Hi {name},\nSorry to hear that. Could you send photos of the damage so we can raise a claim?\n{sig}, Packwell Orders",
          issues: ['missed_question'],
          note: 'The photos were attached to the first message.',
        },
        bad: {
          body: "Hi {name},\nDamage in transit is the responsibility of the courier, please contact them directly to raise a claim.\n{sig}, Packwell Orders",
          issues: ['skipped_procedure'],
          note: 'Our procedure is to replace and claim ourselves. We pushed our problem onto the customer.',
        },
      },
      {
        subject: 'Price for 10,000 MB-40',
        message: "What's your price per unit for 10,000 MB-40? Need to compare with another supplier by end of day.",
        good: {
          body: "Hi {name},\nMB-40 at 10,000: €0.21/unit (€2,100), free delivery. At 25,000: €0.18.\nQuote valid 30 days; I can hold stock for a week.\n{sig}, Packwell Orders",
          note: 'Price, next tier and validity in three lines. They asked by end of day and got it in 20 minutes.',
        },
        weak: {
          body: "Hi {name},\nMB-40 at 10,000: €0.21/unit (€2,100), free delivery. Valid 30 days.\n{sig}, Packwell Orders",
          issues: ['too_slow'],
          slow: true,
          note: 'Perfect reply, sent the next morning. They told us the deadline was end of day.',
        },
        bad: {
          body: "Hi {name},\nMB-40 at 10,000 is €0.17/unit. Let me know if you'd like to go ahead!\n{sig}",
          issues: ['wrong_information'],
          note: 'Quoted from the 2023 price list. Either we eat 4 cents a unit or we go back on a written quote.',
        },
      },
      {
        subject: 'Change delivery address',
        message: 'Please deliver {order} to our new warehouse: Unit 4, Polígono Sur, 28906 Getafe.',
        good: {
          body: "Hi {name},\n{order} updated to Unit 4, Polígono Sur, 28906 Getafe. It hasn't left yet; delivery stays Wednesday.\nI've also set it as the default address on your account.\n{sig}, Packwell Orders",
          note: 'Checked the dispatch status before confirming. Good.',
        },
        weak: {
          body: "Hi {name},\n\nThanks for letting us know about your move, and congratulations on the new warehouse! I've gone ahead and made that change for you, so your order should now be heading to Unit 4, Polígono Sur. If you have any other orders in the pipeline you'd like updated as well, just let me know and I'll be glad to help.\n\nBest wishes,\n{sig}",
          issues: ['too_long'],
          note: 'Fine, but half of it is small talk and it never confirms the delivery date.',
        },
        bad: {
          body: "Hi {name},\nDone, the address has been updated.\n{sig}, Packwell Orders",
          issues: ['wrong_information', 'skipped_procedure'],
          note: 'The order had already been dispatched to the old address. We said "done" without looking.',
        },
      },
      {
        subject: 'Samples of kraft mailers',
        message: 'Could you send 3 samples of each kraft mailer size before we switch from plastic?',
        good: {
          body: "Hi {name},\n3 × each kraft size (KM-20, KM-30, KM-40) posted today, free of charge, arriving Tuesday.\nSpec sheet with dimensions and recycled content attached.\n{sig}, Packwell Orders",
          note: 'Clean.',
        },
        weak: {
          body: "Hi {name},\nWe have three kraft sizes, KM-20, KM-30 and KM-40. Prices are on the website.\n{sig}, Packwell Orders",
          issues: ['missed_question'],
          note: 'They asked for samples, not prices.',
        },
        bad: {
          body: "Hi {name},\nSorry, we don't send samples.\n{sig}",
          issues: ['wrong_information'],
          note: 'We do, free, up to 5 per size. That was a lost account in the making.',
        },
      },
    ],
  },
  {
    slug: 'lumen',
    name: 'Lumen Skin',
    orderPrefix: '#LM',
    responseMinutes: [30, 240],
    standard: [
      'Warm and unhurried; the customer is often worried.',
      'Any reaction: tell them to stop using it, refund in full, never ask for the product back.',
      'Never give medical advice. Give exact ingredients and point to a pharmacist or doctor.',
      'Ingredient facts must match the product page. Sign off "Warmly, <name> at Lumen".',
    ].join('\n'),
    scenarios: [
      {
        subject: 'Rash after using the serum',
        message: "I used the Clear Glow serum for three days and now my cheeks are red and itchy. Is this normal? Order {order}.",
        good: {
          body: "Hi {name},\n\nI'm really sorry, that sounds uncomfortable. Please stop using the serum now. I've refunded order {order} in full; there's no need to send anything back.\n\nIf the redness hasn't settled in a couple of days, or it gets worse, please see a pharmacist or your doctor. The serum contains 10% niacinamide and 2% azelaic acid, which is useful to tell them.\n\nIf you're happy to share the batch number on the bottom of the bottle, it helps us check the batch.\n\nWarmly,\n{sig} at Lumen",
          note: 'Stop, refund, no return, ingredients for the pharmacist. Every step of the procedure.',
        },
        weak: {
          body: "Hi {name},\n\nI'm sorry to hear that. Please stop using the serum. If you send the bottle back to us we'll process a refund once it arrives.\n\nWarmly,\n{sig} at Lumen",
          issues: ['skipped_procedure'],
          note: 'Reactions are refunded without a return. Asking someone with a rash to post a bottle is not the brand.',
        },
        bad: {
          body: "Hi {name},\n\nDon't worry, this is a normal purging reaction as your skin adjusts! Keep going for another two weeks and it should calm down.\n\nWarmly,\n{sig} at Lumen",
          issues: ['wrong_information', 'skipped_procedure'],
          note: "Medical advice, and wrong. This is the reply that ends up on social media. Escalated to the brand the same day.",
        },
      },
      {
        subject: 'Is the moisturiser safe in pregnancy?',
        message: "I'm 12 weeks pregnant. Is the Daily Barrier moisturiser safe to use?",
        good: {
          body: "Hi {name},\n\nCongratulations! We can't give medical advice, but I can tell you exactly what's in it so you can check with your midwife: Daily Barrier contains ceramides, squalane, glycerin and 2% niacinamide. It has no retinoids, no salicylic acid and no essential oils.\n\nThe full ingredient list is here: lumen.example/daily-barrier#inci\n\nWarmly,\n{sig} at Lumen",
          note: 'No medical advice, exact ingredients, points to the midwife. Textbook.',
        },
        weak: {
          body: "Hi {name},\n\nUnfortunately we're unable to give medical advice. Please consult your doctor.\n\n{sig}",
          issues: ['wont_resolve', 'off_brand_tone'],
          note: 'Correct but cold. Give them the ingredients so the doctor conversation takes one minute.',
        },
        bad: {
          body: "Hi {name},\n\nYes, it's totally safe during pregnancy, all our products are natural!\n\nWarmly,\n{sig} at Lumen",
          issues: ['wrong_information'],
          note: 'We are not allowed to say "safe during pregnancy". Serious.',
        },
      },
      {
        subject: 'Charged twice for my subscription',
        message: "My card was charged twice this month for the Lumen subscription (order {order}). Please refund one.",
        good: {
          body: "Hi {name},\n\nYou're right, and I'm sorry: a payment retry went through twice on the 4th. I've refunded the duplicate €34.00; it usually shows on your statement within 3 to 5 working days.\n\nYour next box ships as normal on the 1st.\n\nWarmly,\n{sig} at Lumen",
          note: 'Found the cause, refunded, told them what happens next.',
        },
        weak: {
          body: "Hi {name},\n\nSo sorry about that! I've refunded the duplicate €34.00, it should appear within 3 to 5 working days.\n\nWarmly,\n{sig} at Lumen",
          issues: ['too_slow'],
          slow: true,
          note: 'Right answer, but a double charge sat for 30 hours.',
        },
        bad: {
          body: "Hi {name},\n\nWe can only see one charge on our side. Please contact your bank about the second one.\n\nWarmly,\n{sig} at Lumen",
          issues: ['skipped_procedure', 'wrong_information'],
          note: "The payments log shows both charges. We sent the customer to their bank for our error.",
        },
      },
      {
        subject: 'What should I use for oily skin?',
        message: 'I have oily skin with some breakouts on my chin. Which of your products would you recommend?',
        good: {
          body: "Hi {name},\n\nFor oily skin with breakouts, most people start with two products:\n\n- Clear Glow serum (niacinamide + azelaic acid) in the evening.\n- Light Gel moisturiser in the morning; it's oil-free and won't feel heavy.\n\nIntroduce the serum every other night for the first week, and patch test on your jaw for 24 hours first. If breakouts are painful or persistent, a pharmacist is the right next stop.\n\nWarmly,\n{sig} at Lumen",
          note: 'Specific, includes the patch test, knows its limits.',
        },
        weak: {
          body: "Hi {name},\n\nThanks so much for reaching out! Skincare is such a personal journey and everyone's skin is different, so it's really about finding what works for you. We have a lovely range of products for all skin types, and many of our customers with oily skin really love our serums and moisturisers. You could take a look at our website to explore the full range and see what speaks to you!\n\nWarmly,\n{sig} at Lumen",
          issues: ['too_long', 'missed_question'],
          note: 'Long, and never names a product. They asked which one.',
        },
        bad: {
          body: "Hi {name},\n\nOur Rich Night Balm would be perfect for you, it's our best seller!\n\nWarmly,\n{sig} at Lumen",
          issues: ['wrong_information'],
          note: 'The balm is shea and oils, the worst option for oily, breakout-prone skin.',
        },
      },
      {
        subject: 'Parcel arrived leaking',
        message: 'My order {order} arrived and the cleanser had leaked all over the box.',
        good: {
          body: "Hi {name},\n\nSorry about the mess! A replacement cleanser is on its way today with tracking, and there's no need to return anything. I've also flagged the pump batch with our warehouse.\n\nWarmly,\n{sig} at Lumen",
          note: 'Quick and warm. Good.',
        },
        weak: {
          body: "Hi {name},\n\nSorry to hear that. Could you send a photo of the damage so we can look into it?\n\nWarmly,\n{sig} at Lumen",
          issues: ['wont_resolve'],
          note: 'We replace leaks without photos under €20. One more round trip for nothing.',
        },
        bad: {
          body: "Hi {name},\n\nWe're not responsible for damage in transit. Please contact the courier.\n\n{sig}",
          issues: ['skipped_procedure', 'off_brand_tone'],
          note: 'Wrong procedure and does not sound like Lumen at all.',
        },
      },
      {
        subject: 'Are your products vegan?',
        message: 'Are all your products vegan? I want to buy the full routine.',
        good: {
          body: "Hi {name},\n\nAlmost all of them. Every Lumen product is vegan except the Rich Night Balm, which contains beeswax. None of our products are tested on animals.\n\nFor a fully vegan routine, swap the balm for the Daily Barrier moisturiser.\n\nWarmly,\n{sig} at Lumen",
          note: 'Exact, including the one exception. This is why accuracy matters for Lumen.',
        },
        weak: {
          body: "Hi {name},\n\nWe're cruelty-free and never test on animals!\n\nWarmly,\n{sig} at Lumen",
          issues: ['missed_question'],
          note: 'Cruelty-free is not vegan. Answered a different question.',
        },
        bad: {
          body: "Hi {name},\n\nYes, all our products are 100% vegan!\n\nWarmly,\n{sig} at Lumen",
          issues: ['wrong_information'],
          note: 'The night balm has beeswax. A vegan customer will find out.',
        },
      },
    ],
  },
];

export const people = [
  { key: 'marta', full_name: 'Marta Iglesias', email: 'marta@sellervate.test' },
  { key: 'nuria', full_name: 'Nuria Campos', email: 'nuria@sellervate.test' },
  { key: 'dani', full_name: 'Dani Ortega', email: 'dani@sellervate.test' },
  { key: 'aisha', full_name: 'Aisha Bello', email: 'aisha@sellervate.test' },
  { key: 'tomas', full_name: 'Tomás Reyes', email: 'tomas@sellervate.test' },
];

export const memberships = [
  { brand: 'voltra', person: 'marta', role: 'lead' },
  { brand: 'packwell', person: 'marta', role: 'lead' },
  { brand: 'lumen', person: 'nuria', role: 'lead' },
  { brand: 'voltra', person: 'dani', role: 'specialist' },
  { brand: 'voltra', person: 'aisha', role: 'specialist' },
  { brand: 'packwell', person: 'dani', role: 'specialist' },
  { brand: 'packwell', person: 'tomas', role: 'specialist' },
  { brand: 'lumen', person: 'aisha', role: 'specialist' },
  { brand: 'lumen', person: 'tomas', role: 'specialist' },
];

// Dated changes a lead made, so the trend has something to be explained by.
// weeksAgo is when the change took effect.
export const brandChanges = [
  { brand: 'voltra', author: 'marta', weeksAgo: 8,
    summary: "Order-history check is now step 1 of the 'Where is my order' macro. Walked Dani through the three tickets the brand escalated." },
  { brand: 'voltra', author: 'marta', weeksAgo: 4,
    summary: 'Added E07 and range diagnostics to the Voltra playbook, with the firmware versions to check.' },
  { brand: 'packwell', author: 'marta', weeksAgo: 6,
    summary: 'Pinned a three-line template for quote and stock requests; retired the long greeting macro.' },
  { brand: 'lumen', author: 'nuria', weeksAgo: 5,
    summary: 'Reaction procedure reinforced in the team call: refund without return, never say "purging".' },
];

export const customerNames = [
  'Laura', 'Javier', 'Sofía', 'Pablo', 'Elena', 'Marcos', 'Irene', 'Hugo', 'Carmen',
  'Álvaro', 'Lucía', 'Sergio', 'Nerea', 'Óscar', 'Ana', 'Raúl', 'Claudia', 'Iván',
  'Beatriz', 'Diego', 'Alba', 'Mario', 'Paula', 'Adrián',
];
