import { useState, useEffect } from "react";
import "../index.css";

export default function MarsRoverAPI() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banList, setBanList] = useState([]);
  const [retry, setRetry] = useState(false); // Trigger retry on broken images

  const url = "https://api.nasa.gov/mars-photos/api/v1/rovers";
  const apiKey = import.meta.env.VITE_NASA_API_KEY;

  const rovers = ["curiosity", "opportunity", "spirit"];
  const cameras = ["FHAZ", "RHAZ", "MAST", "CHEMCAM", "MAHLI"];

  const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
  const getRandomSol = () => Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;

  const filterOutBannedItems = () => {
    const bannedRovers = banList.filter(ban => ban.attribute === "rover").map(ban => ban.value);
    const bannedCameras = banList.filter(ban => ban.attribute === "camera").map(ban => ban.value);

    const availableRovers = rovers.filter(rover => !bannedRovers.includes(rover));
    const availableCameras = cameras.filter(camera => !bannedCameras.includes(camera));

    if (availableRovers.length === 0 || availableCameras.length === 0) {
      return null; // Prevent infinite loops if all are banned
    }

    return {
      rover: getRandomElement(availableRovers),
      camera: getRandomElement(availableCameras),
      sol: getRandomSol(),
    };
  };

  const getDataFromAPI = async () => {
    setLoading(true);
    setError(null);

    while (true) { // Keep trying until valid data is found
      try {
        const selection = filterOutBannedItems();
        if (!selection) {
          setError("All rovers or cameras are banned.");
          setLoading(false);
          return;
        }

        const { rover, camera, sol } = selection;
        const query = `${url}/${rover}/photos?sol=${sol}&camera=${camera}&api_key=${apiKey}`;

        console.log("Fetching:", query);

        const response = await fetch(query);
        if (!response.ok) throw new Error("Failed to fetch data.");

        const fetchedData = await response.json();
        let validPhotos = fetchedData.photos.filter(
          (photo) =>
            !banList.some(ban => 
              (ban.attribute === "rover" && ban.value === photo.rover.name) ||
              (ban.attribute === "camera" && ban.value === photo.camera.name) ||
              (ban.attribute === "earth_date" && ban.value === photo.earth_date)
            )
        );

        if (validPhotos.length > 0) {
          setData(validPhotos[0]); // Found a valid photo, exit loop
          setLoading(false);
          return;
        }

        console.warn("No valid photos found, retrying...");

      } catch (error) {
        console.log("Retrying fetch due to error:", error.message);
      }
    }
  };

  const handleImageError = () => {
    console.warn("Broken image detected. Fetching a new one...");
    setRetry(prev => !prev); // Toggle state to trigger re-fetch
  };

  const handleBanAttribute = (attribute, value) => {
    setBanList(prevBanList => [...prevBanList, { attribute, value }]);
  };

  useEffect(() => {
    getDataFromAPI();
  }, [banList, retry]); // Trigger retry when `retry` state changes

  return (
    <div>
      <h1>Discover Mars Rover Photos</h1>
      <button onClick={getDataFromAPI}>Get Random Mars Rover Photo</button>

      {loading && !error && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}

      {data && !loading && !error && (
        <div className="mars-photos-container">
          <h2>{data.rover.name} - {data.camera.name}</h2>
          <p>Date: {data.earth_date}</p>
          <img 
            src={data.img_src} 
            alt="Mars Photo" 
            className="api-image" 
            onError={handleImageError}  // Skip broken images instantly
          />
          <h3>
            Click to ban items:
          </h3>
          <div>
          
            <button onClick={() => handleBanAttribute("rover", data.rover.name)}>
              Rover: {data.rover.name}
            </button>
            <button onClick={() => handleBanAttribute("camera", data.camera.name)}>
               Camera: {data.camera.name}
            </button>
            <button onClick={() => handleBanAttribute("earth_date", data.earth_date)}>
               Date: {data.earth_date}
            </button>
          </div>
        </div>
      )}

      <section className="ban-list">
        <h3>Banned Attributes (Click to remove from banned list)</h3>
        {banList.length > 0 ? (
          <ul>
            {banList.map((ban, index) => (
              
                <button onClick={() => setBanList(banList.filter((_, i) => i !== index))}>
                 {ban.attribute}: {ban.value}
                </button>
              
            ))}
          </ul>
        ) : (
          <p>No attributes banned yet.</p>
        )}
      </section>
    </div>
  );
}
