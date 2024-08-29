// Importing node-fetch using dynamic import
const getPlaceDetails = async (placeId, apiKey) => {
    try {
      const fetch = (await import('node-fetch')).default;
  
      const placeDetailsResponse = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`);
      const placeDetailsData = await placeDetailsResponse.json();
  
      return placeDetailsData;
    } catch (error) {
      console.error('Error fetching place details:', error);
      throw error; // Propagate the error back to the caller
    }
  };
  
  module.exports = {
    getPlaceDetails
  };
  