// ==========================================
// 🕷️ FASITRACKER
// ==========================================


// ==========================================
// 🔥 SUPABASE
// ==========================================

const SUPABASE_URL =
  "https://qddduaofuxphkunucved.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_wuIyDwsNJbvpW7O0vC0YnQ_FbVb8G5V";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==========================================
// 📦 VARIABLES
// ==========================================

let lat = null;
let lng = null;

let map = null;
let markers = [];

let fasiMatcher = null;
let aiLoading = null;


// VERY IMPORTANT
// Default = NOT Fasi

window.fasiDetected = false;
window.aiChecked = false;


// ==========================================
// 🌐 HTML ELEMENTS
// ==========================================

const photo =
  document.getElementById("photo");

const preview =
  document.getElementById("preview");

const locationBtn =
  document.getElementById("locationBtn");

const reportBtn =
  document.getElementById("reportBtn");

const aiStatus =
  document.getElementById("aiStatus");


// ==========================================
// 🕷️ MAP ICON
// ==========================================

const spiderIcon =
  L.divIcon({

    html: "🌚",

    className:
      "spider-marker",

    iconSize: [35, 35],

    iconAnchor: [17, 17]

  });


// ==========================================
// 🧠 FASI AI SETTINGS
// ==========================================

const MODEL_PATH =
  "models";


const fasiPhotos = [

  "models/photo/fasil.jpg",

  "models/photo/fasil1.jpg",

  "models/photo/fasil2.jpg"

];


// ==========================================
// 🎯 FACE DETECTOR
// ==========================================

const detectorOptions =
  new faceapi.TinyFaceDetectorOptions({

    inputSize: 320,

    scoreThreshold: 0.1

  });


// ==========================================
// 🔊 FASI BGM
// ==========================================
// Put your music here:
//
// FasiTracker/
// └── sounds/
//     └── fasi.mp3
//
// The music will play for 8 seconds
// when Fasi is successfully detected.
// ==========================================

const fasiBGM =
  new Audio("sounds/fasi.mp3");

fasiBGM.volume = 0.8;

fasiBGM.preload = "auto";


function playFasiSound() {

  try {

    // Restart from beginning
    fasiBGM.currentTime = 0;


    // Play your BGM
    fasiBGM.play()

      .then(() => {

        console.log(
          "🔊 Fasi BGM playing!"
        );

      })

      .catch(error => {

        console.warn(
          "🔇 Browser blocked audio:",
          error
        );

      });


  

  }

  catch (error) {

    console.error(
      "🔇 Sound error:",
      error
    );

  }

}


// ==========================================
// 🧠 LOAD FACE AI
// ==========================================

async function loadFaceAI() {

  try {

    aiStatus.textContent =
      "🧠 Loading AI models...";


    // --------------------------------------
    // FACE DETECTOR
    // --------------------------------------

    await faceapi.nets
      .tinyFaceDetector
      .loadFromUri(MODEL_PATH);


    console.log(
      "✅ Tiny face detector loaded"
    );


    // --------------------------------------
    // FACE LANDMARKS
    // --------------------------------------

    await faceapi.nets
      .faceLandmark68Net
      .loadFromUri(MODEL_PATH);


    console.log(
      "✅ Face landmarks loaded"
    );


    // --------------------------------------
    // FACE RECOGNITION
    // --------------------------------------

    await faceapi.nets
      .faceRecognitionNet
      .loadFromUri(MODEL_PATH);


    console.log(
      "✅ Face recognition loaded"
    );


    aiStatus.textContent =
      "🧠 Learning Fasi's face...";


    const descriptors = [];


    // ======================================
    // 👤 LEARN FASI PHOTOS
    // ======================================

    for (
      const imagePath of fasiPhotos
    ) {

      try {

        console.log(
          "🔍 Processing:",
          imagePath
        );


        const img =
          await faceapi.fetchImage(
            imagePath
          );


        const detection =
          await faceapi

            .detectSingleFace(
              img,
              detectorOptions
            )

            .withFaceLandmarks()

            .withFaceDescriptor();


        if (detection) {

          descriptors.push(
            detection.descriptor
          );


          console.log(
            "✅ Fasi face found:",
            imagePath
          );

        }

        else {

          console.warn(
            "⚠️ No face found:",
            imagePath
          );

        }

      }

      catch (error) {

        console.error(
          "❌ Could not process:",
          imagePath,
          error
        );

      }

    }


    // ======================================
    // ❌ NO TRAINING FACES
    // ======================================

    if (
      descriptors.length === 0
    ) {

      aiStatus.innerHTML =
        `❌ <b>No Fasi face found.</b><br>
         <small>
         Check models/photo/ images.
         </small>`;

      return;

    }


    // ======================================
    // 🧠 CREATE FASI MATCHER
    // ======================================

    fasiMatcher =
      new faceapi.FaceMatcher(

        new faceapi
          .LabeledFaceDescriptors(

            "Fasi",

            descriptors

          ),

        0.6

      );


    aiStatus.innerHTML =
      `✅ <b>Fasi AI ready!</b><br>
       🧠 ${descriptors.length}
       photo(s) learned`;


    console.log(
      "================================"
    );

    console.log(
      "🧠 FASI AI READY!"
    );

    console.log(
      "Training photos:",
      descriptors.length
    );

    console.log(
      "================================"
    );

  }

  catch (error) {

    console.error(
      "❌ FACE AI ERROR:",
      error
    );


    aiStatus.innerHTML =
      `❌ <b>AI Error</b><br>
       <small>${error.message}</small>`;

  }

}


// ==========================================
// 🚀 START AI
// ==========================================

aiLoading =
  loadFaceAI();


// ==========================================
// 📸 PHOTO SELECTION
// ==========================================

photo.onchange = () => {

  const file =
    photo.files[0];


  if (!file)
    return;


  // --------------------------------------
  // 🔄 RESET AI RESULT
  // --------------------------------------

  window.fasiDetected =
    false;

  window.aiChecked =
    false;


  // --------------------------------------
  // SHOW PREVIEW
  // --------------------------------------

  const imageURL =
    URL.createObjectURL(file);


  preview.src =
    imageURL;


  preview.style.display =
    "block";


  aiStatus.textContent =
    "🧠 Preparing photo...";


  // --------------------------------------
  // WAIT FOR IMAGE
  // --------------------------------------

  preview.onload =
    async () => {

      await aiLoading;

      await checkFasi(
        preview
      );

    };

};


// ==========================================
// 🧠 CHECK IF PHOTO IS FASI
// ==========================================

async function checkFasi(image) {

  await aiLoading;


  // ======================================
  // ❌ AI NOT READY
  // ======================================

  if (!fasiMatcher) {

    window.fasiDetected =
      false;

    window.aiChecked =
      false;


    aiStatus.innerHTML =
      `❌ <b>Fasi AI is not ready.</b><br>
       <small>
       Cannot verify this photo.
       </small>`;

    return;

  }


  aiStatus.textContent =
    "🧠 Looking for a face...";


  try {

    // ======================================
    // 👀 DETECT FACE
    // ======================================

    const detection =
      await faceapi

        .detectSingleFace(
          image,
          detectorOptions
        )

        .withFaceLandmarks()

        .withFaceDescriptor();


    console.log(
      "👀 Detection:",
      detection
    );


    // ======================================
    // ❌ NO FACE
    // ======================================

    if (!detection) {

      window.fasiDetected =
        false;

      window.aiChecked =
        true;


      aiStatus.innerHTML =
        `👀 <b>No face detected.</b><br>
         <small>
         📋 History only<br>
         ❌ Not added to map
         </small>`;

      return;

    }


    console.log(
      "✅ Face detected!"
    );


    // ======================================
    // 🧠 COMPARE WITH FASI
    // ======================================

    const result =
      fasiMatcher.findBestMatch(
        detection.descriptor
      );


    console.log(
      "🧠 Face match:",
      result
    );


    // ======================================
    // 🕷️ FASI FOUND
    // ======================================

    if (
      result.label === "Fasi"
    ) {

      window.fasiDetected =
        true;

      window.aiChecked =
        true;


      // ==================================
      // 🔊 PLAY YOUR BGM
      // ==================================

      playFasiSound();


      aiStatus.innerHTML =
        `🕷️ <b>SPIDER FOUND!</b> 😂<br>
         🧑 <b>Fasi detected!</b><br>
         <small>
         Match distance:
         ${result.distance.toFixed(2)}
         </small><br>
         📍 <b>Will appear on map</b>
        `;


      console.log(
        "🕷️ FASI DETECTED!"
      );

    }


    // ======================================
    // 👤 SOMEONE ELSE
    // ======================================

    else {

      window.fasiDetected =
        false;

      window.aiChecked =
        true;


      aiStatus.innerHTML =
        `👤 <b>Unknown person detected.</b><br>
         <small>
         📋 History only<br>
         ❌ Not added to map<br>
         Not Fasi 😭
         </small>`;


      console.log(
        "👤 UNKNOWN PERSON"
      );

    }

  }

  catch (error) {

    console.error(
      "❌ FACE ANALYSIS ERROR:",
      error
    );


    window.fasiDetected =
      false;

    window.aiChecked =
      false;


    aiStatus.innerHTML =
      `❌ <b>AI Error</b><br>
       <small>${error.message}</small>`;

  }

}


// ==========================================
// 📍 GET LOCATION
// ==========================================

function getLocation() {

  const status =
    document.getElementById(
      "location"
    );


  if (!navigator.geolocation) {

    status.textContent =
      "❌ Geolocation not supported.";

    return;

  }


  status.textContent =
    "📍 Getting location...";


  navigator.geolocation.getCurrentPosition(

    pos => {

      lat =
        pos.coords.latitude;

      lng =
        pos.coords.longitude;


      status.textContent =
        `📍 ${lat.toFixed(5)},
         ${lng.toFixed(5)}`;


      if (map) {

        map.setView(
          [lat, lng],
          16
        );

      }

    },

    error => {

      console.error(
        "LOCATION ERROR:",
        error
      );


      status.textContent =
        "❌ Location permission denied.";

    }

  );

}


// ==========================================
// 🕷️ REPORT SIGHTING
// ==========================================

async function reportSighting() {

  const name =
    document
      .getElementById("name")
      .value
      .trim();


  const notes =
    document
      .getElementById("notes")
      .value
      .trim();


  const file =
    photo.files[0];


  // ======================================
  // VALIDATE NAME
  // ======================================

  if (!name) {

    alert(
      "Enter the spider name."
    );

    return;

  }


  // ======================================
  // VALIDATE LOCATION
  // ======================================

  if (
    lat === null ||
    lng === null
  ) {

    alert(
      "Get your location first."
    );

    return;

  }


  // ======================================
  // IF PHOTO EXISTS
  // MAKE SURE AI CHECKED IT
  // ======================================

  if (
    file &&
    !window.aiChecked
  ) {

    alert(
      "🧠 Please wait for Fasi AI to analyze the photo."
    );

    return;

  }


  try {

    let photoUrl =
      null;


    // ======================================
    // 📸 UPLOAD PHOTO
    // ======================================

    if (file) {

      const filename =
        `${Date.now()}-${file.name}`;


      const {
        error: uploadError
      } =
        await db.storage

          .from(
            "spider-photos"
          )

          .upload(
            filename,
            file
          );


      if (uploadError)
        throw uploadError;


      const { data } =
        db.storage

          .from(
            "spider-photos"
          )

          .getPublicUrl(
            filename
          );


      photoUrl =
        data.publicUrl;

    }


    // ======================================
    // 🧠 AI RESULT
    // ======================================

    const fasiDetected =
      window.fasiDetected === true;


    console.log(
      "================================"
    );

    console.log(
      "🧠 Fasi detected:",
      fasiDetected
    );

    console.log(
      "================================"
    );


    // ======================================
    // 💾 SAVE TO SUPABASE
    // ======================================

    const {
      error
    } =
      await db

        .from(
          "sightings"
        )

        .insert({

          name:
            name,

          notes:
            notes,

          latitude:
            lat,

          longitude:
            lng,

          photo_url:
            photoUrl,

          fasi_detected:
            fasiDetected

        });


    if (error)
      throw error;


    // ======================================
    // 🎉 SUCCESS MESSAGE
    // ======================================

    if (
      fasiDetected
    ) {

      alert(
        "🕷️ Fasi detected!\n\n📍 Added to map!"
      );

    }

    else {

      alert(
        "📋 Saved to history!\n\n❌ Not added to map."
      );

    }


    // ======================================
    // 🧹 CLEAR FORM
    // ======================================

    document
      .getElementById("name")
      .value = "";


    document
      .getElementById("notes")
      .value = "";


    photo.value =
      "";


    preview.src =
      "";


    preview.style.display =
      "none";


    window.fasiDetected =
      false;

    window.aiChecked =
      false;


    aiStatus.innerHTML =
      "🧠 Ready for next photo";


    // ======================================
    // 🔄 RELOAD
    // ======================================

    await loadSightings();

  }

  catch (error) {

    console.error(
      "❌ SAVE ERROR:",
      error
    );


    alert(
      "❌ Failed:\n" +
      error.message
    );

  }

}


// ==========================================
// 🗺️ INITIALIZE MAP
// ==========================================

function initMap() {

  map =
    L.map("map")
      .setView(
        [10.8505, 76.2711],
        7
      );


  L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {

      attribution:
        "© OpenStreetMap contributors"

    }

  ).addTo(map);

}


// ==========================================
// 📋 LOAD SIGHTINGS
// ==========================================

async function loadSightings() {

  const box =
    document.getElementById(
      "sightings"
    );


  const {
    data,
    error
  } =
    await db

      .from(
        "sightings"
      )

      .select("*")

      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "LOAD ERROR:",
      error
    );


    box.innerHTML =
      "<p>❌ Failed to load sightings.</p>";

    return;

  }


  // ======================================
  // 🧹 REMOVE OLD MARKERS
  // ======================================

  markers.forEach(
    marker => {

      map.removeLayer(
        marker
      );

    }
  );


  markers = [];


  // ======================================
  // NO DATA
  // ======================================

  if (!data || !data.length) {

    box.innerHTML =
      "<p>No sightings yet.</p>";

    return;

  }


  // ======================================
  // 🗺️ MAP
  // ONLY FASI = TRUE
  // ======================================

  data.forEach(
    s => {

      if (
        s.fasi_detected !== true
      ) {

        return;

      }


      const marker =
        L.marker(

          [

            Number(
              s.latitude
            ),

            Number(
              s.longitude
            )

          ],

          {

            icon:
              spiderIcon

          }

        )

        .addTo(map)

        .bindPopup(`

          <b>🕷️ Fasi Found!</b>

          <br><br>

          👤 ${s.name}

          <br>

          ${s.notes || "No notes."}

        `);


      markers.push(
        marker
      );

    }
  );


  // ======================================
  // 📋 HISTORY
  // SHOW EVERYTHING
  // ======================================

  box.innerHTML =

    data

      .map(

        s => `

          <div class="sighting">

            ${
              s.photo_url

                ? `

                  <img
                    src="${s.photo_url}"
                    alt="Sighting"
                  >

                `

                : ""
            }


            <h3>

              ${
                s.fasi_detected === true

                  ? "🕷️ Fasi Found!"

                  : "📋 Sighting"
              }

              ${s.name}

            </h3>


            <p>

              ${
                s.notes ||
                "No notes."
              }

            </p>


            <small>

              📍
              ${
                Number(
                  s.latitude
                ).toFixed(5)
              },

              ${
                Number(
                  s.longitude
                ).toFixed(5)
              }

            </small>


            <br>


            <small>

              ${
                s.fasi_detected === true

                  ? "🗺️ Shown on map"

                  : "📋 History only"

              }

            </small>


          </div>

        `

      )

      .join("");

}


// ==========================================
// 🚀 START APPLICATION
// ==========================================

initMap();

loadSightings();