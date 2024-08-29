exports.getAutocomplete = async (req, res, apiKey) => {
  const { input } = req.query;
  try {
    const fetch = await import('node-fetch').then(mod => mod.default);

    // Add the components=country:IN parameter to restrict results to India
    const autocompleteResponse = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=${apiKey}&components=country:IN`);
    
    // Log the status and response text for debugging
    console.log('Autocomplete Response Status:', autocompleteResponse.status);
    const autocompleteData = await autocompleteResponse.json();
    console.log('Autocomplete Response Data:', autocompleteData);

    if (autocompleteData.status !== "OK") {
      return res.status(500).json({ error: `Failed to fetch autocomplete: ${autocompleteData.status}`, details: autocompleteData });
    }

    const getPlaceDetails = async (placeId) => {
      const placeDetailsResponse = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`);
      const placeDetailsData = await placeDetailsResponse.json();
      return placeDetailsData.result;
    };

    const predictionsWithDetails = await Promise.all(
      autocompleteData.predictions.map(async (prediction) => {
        const placeDetails = await getPlaceDetails(prediction.place_id);
        const addressComponents = placeDetails.address_components;
        const formattedAddress = placeDetails.formatted_address;

        // Find and extract postal code
        const postalCodeComponent = addressComponents.find(component => component.types.includes('postal_code'));
        const postalCode = postalCodeComponent ? postalCodeComponent.long_name : null;

        return { ...prediction, addressComponents, formattedAddress, postalCode };
      })
    );

    res.json({ predictions: predictionsWithDetails, status: autocompleteData.status });
  } catch (error) {
    console.error('Error fetching autocomplete or place details:', error);
    res.status(500).json({ error: 'Failed to fetch autocomplete or place details', details: error.message });
  }
};
