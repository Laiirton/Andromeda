import { supabase } from './pokemon/database.js';

/**
 * Get or create a user in the database.
 * @param {string} username - The username of the user.
 * @param {string} phoneNumber - The phone number of the user.
 * @returns {object|null} The user object or null if an error occurs.
 */
export async function getOrCreateUser(username, phoneNumber) {
  try {
    // Clean the phone number by removing non-numeric characters
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

    if (!cleanPhoneNumber || cleanPhoneNumber.length < 10) {
      console.error('Invalid phone number:', phoneNumber);
      return null;
    }

    // First, try to find the user by the cleaned phone number
    let { data: user, error } = await supabase
      .from('users')
      .select('id, username, phone_number')
      .eq('phone_number', cleanPhoneNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!user) {
      // If not found, create a new user with the provided username
      const cleanUsername = username ? username.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 50) : 'WhatsApp User';
      
      ({ data: user, error } = await supabase
        .from('users')
        .insert({ username: cleanUsername, phone_number: cleanPhoneNumber })
        .select('id, username, phone_number')
        .single());

      if (error) {
        if (error.code === '23505') { // Unique constraint violation code
          console.error('User already exists with this phone number');
          return null;
        }
        throw error;
      }
    } else if (user.username !== username) {
      // Update the username if it differs from the provided one
      const cleanUsername = username ? username.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 50) : user.username;
      
      ({ data: user, error } = await supabase
        .from('users')
        .update({ username: cleanUsername })
        .eq('id', user.id)
        .select('id, username, phone_number')
        .single());

      if (error) throw error;
    }

    return user;
  } catch (error) {
    console.error('Error getting or creating user:', error);
    return null;
  }
}
