'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function VendorProfile({ userName, userEmail, setUserName, setProfile, setError }) {
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editBusinessLogo, setEditBusinessLogo] = useState('');
  const [editTin, setEditTin] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editMobileMoney, setEditMobileMoney] = useState('');
  const [editKycDocuments, setEditKycDocuments] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [error, setLocalError] = useState('');

  const USE_SIGNED_URLS = false; // Set to true for private buckets

  // Debug Supabase client and authentication
  useEffect(() => {
    async function debugSupabase() {
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session:', session, 'Session Error:', sessionError);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User:', user, 'User Error:', userError);
    }
    debugSupabase();
  }, []);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      setFetchError('');
      setLocalError('');
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setFetchError('Please log in to view your profile.');
          setError('Please log in to view your profile.');
          console.error('Fetch user error:', userError);
          return;
        }

        let { data, error } = await supabase
          .from('profiles')
          .select('business_name, business_logo, tin, bank_account, mobile_money, kyc_documents, kyc_status')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          const newProfile = {
            id: user.id,
            business_name: '',
            business_logo: '',
            tin: '',
            bank_account: '',
            mobile_money: '',
            kyc_documents: [],
            kyc_status: 'not_started',
          };
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);

          if (insertError) {
            setFetchError('Error creating profile: ' + insertError.message);
            setError('Error creating profile: ' + insertError.message);
            console.error('Insert profile error:', insertError);
            return;
          }
          data = newProfile;
        } else if (error) {
          setFetchError('Error fetching profile: ' + error.message);
          setError('Error fetching profile: ' + error.message);
          console.error('Fetch profile error:', error);
          return;
        }

        setProfileData(data || {});
        setEditBusinessName(data?.business_name || '');
        setEditBusinessLogo(data?.business_logo || '');
        setLogoPreview(data?.business_logo || null);
        setEditTin(data?.tin || '');
        setEditBankAccount(data?.bank_account || '');
        setEditMobileMoney(data?.mobile_money || '');
        setEditKycDocuments(data?.kyc_documents || []);
        setProfile(data || {});
      } catch (err) {
        setFetchError('Unexpected error fetching profile: ' + err.message);
        setError('Unexpected error fetching profile: ' + err.message);
        console.error('Unexpected fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isProfilePanelOpen) {
      fetchProfileData();
    }
  }, [isProfilePanelOpen, setProfile, setError]);

  const handleProfileClick = () => {
    setIsProfilePanelOpen(true);
    setIsEditing(false);
    setLogoFile(null);
    setLogoPreview(editBusinessLogo);
    setDocumentFiles([]);
    setNewPassword('');
    setConfirmPassword('');
    setFetchError('');
    setUploadError('');
    setLocalError('');
  };

  const handleClosePanel = () => {
    setIsProfilePanelOpen(false);
    setIsEditing(false);
    setLocalError('');
    setFetchError('');
    setUploadError('');
    setError('');
    if (logoPreview && logoFile) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(editBusinessLogo);
    setDocumentFiles([]);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const validateFile = (file, isLogo = false) => {
    if (!file) return 'No file selected.';
    const validLogoExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const validDocExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const validExtensions = isLogo ? validLogoExtensions : validDocExtensions;
    const maxSizeMB = isLogo ? 5 : 10;
    const extension = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(extension)) {
      return `Invalid file type for ${file.name}. Only ${validExtensions.join(', ')} are allowed.`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File ${file.name} exceeds ${maxSizeMB}MB size limit.`;
    }
    return null;
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validationError = validateFile(file, true);
    if (validationError) {
      setUploadError(validationError);
      setLocalError(validationError);
      return;
    }
    if (logoPreview && logoFile) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setUploadError('');
    setLocalError('');
  };

  const handleDocumentFilesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + editKycDocuments.length > 5) {
      setUploadError('Maximum 5 KYC documents allowed.');
      setLocalError('Maximum 5 KYC documents allowed.');
      return;
    }
    const validFiles = [];
    for (const file of files) {
      const validationError = validateFile(file, false);
      if (validationError) {
        setUploadError(validationError);
        setLocalError(validationError);
        return;
      }
      validFiles.push(file);
    }
    setDocumentFiles((prev) => [...prev, ...validFiles]);
    setUploadError('');
    setLocalError('');
  };

  const removeKycDocument = (index) => {
    setEditKycDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeLogo = () => {
    if (logoPreview && logoFile) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(editBusinessLogo);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setUploadError('');
    setLocalError('');
    setError('');
    let uploadErrors = [];

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLocalError('User not found. Please log in again.');
        setError('User not found. Please log in again.');
        console.error('User error:', userError);
        return;
      }
      console.log('Authenticated user ID:', user.id);

      // Update user metadata
      if (userName !== profileData?.business_name) {
        const { error: userUpdateError } = await supabase.auth.updateUser({
          data: { name: userName },
        });
        if (userUpdateError) {
          setLocalError('Error updating user metadata: ' + userUpdateError.message);
          setError('Error updating user metadata: ' + userUpdateError.message);
          console.error('User metadata update error:', userUpdateError);
          return;
        }
      }

      // Update password
      if (newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
          setLocalError('Passwords do not match.');
          setError('Passwords do not match.');
          console.error('Password mismatch');
          return;
        }
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) {
          setLocalError('Error updating password: ' + passwordError.message);
          setError('Error updating password: ' + passwordError.message);
          console.error('Password update error:', passwordError);
          return;
        }
      }

      let newLogoUrl = editBusinessLogo;
      if (logoFile) {
        const validationError = validateFile(logoFile, true);
        if (validationError) {
          uploadErrors.push(validationError);
        } else {
          const logoPath = `${user.id}/logo_${Date.now()}_${logoFile.name}`;
          console.log('Uploading logo to:', logoPath);
          const { data, error: logoUploadError } = await supabase.storage
            .from('business-logos')
            .upload(logoPath, logoFile, { upsert: true });
          if (logoUploadError) {
            uploadErrors.push(`Error uploading business logo: ${logoUploadError.message}`);
            console.error('Logo upload error:', logoUploadError);
          } else {
            console.log('Logo upload data:', data);
            const urlResult = USE_SIGNED_URLS
              ? await supabase.storage.from('business-logos').createSignedUrl(logoPath, 3600)
              : await supabase.storage.from('business-logos').getPublicUrl(logoPath);
            if (!urlResult.data?.[USE_SIGNED_URLS ? 'signedUrl' : 'publicUrl']) {
              uploadErrors.push('Failed to get URL for logo.');
              console.error('Logo URL error:', urlResult.error);
            } else {
              newLogoUrl = urlResult.data[USE_SIGNED_URLS ? 'signedUrl' : 'publicUrl'];
              console.log('Logo URL:', newLogoUrl);
            }
          }
        }
      }

      let newKycDocs = [...editKycDocuments];
      if (documentFiles.length > 0) {
        for (const file of documentFiles) {
          const validationError = validateFile(file, false);
          if (validationError) {
            uploadErrors.push(validationError);
            continue;
          }
          const docPath = `${user.id}/kyc_${Date.now()}_${file.name}`;
          console.log('Uploading KYC document to:', docPath);
          const { data, error: docUploadError } = await supabase.storage
            .from('kyc-documents')
            .upload(docPath, file, { upsert: true });
          if (docUploadError) {
            uploadErrors.push(`Error uploading KYC document: ${docUploadError.message}`);
            console.error('Document upload error:', docUploadError);
            continue;
          }
          console.log('KYC document upload data:', data);
          const urlResult = USE_SIGNED_URLS
            ? await supabase.storage.from('kyc-documents').createSignedUrl(docPath, 3600)
            : await supabase.storage.from('kyc-documents').getPublicUrl(docPath);
          if (!urlResult.data?.[USE_SIGNED_URLS ? 'signedUrl' : 'publicUrl']) {
            uploadErrors.push('Failed to get URL for KYC document.');
            console.error('Document URL error:', urlResult.error);
            continue;
          }
          newKycDocs.push(urlResult.data[USE_SIGNED_URLS ? 'signedUrl' : 'publicUrl']);
          console.log('KYC document URL:', urlResult.data[USE_SIGNED_URLS ? 'signedUrl' : 'publicUrl']);
        }
      }

      if (uploadErrors.length > 0) {
        setUploadError(uploadErrors.join('; '));
        setLocalError(uploadErrors.join('; '));
      }

      const profileUpdates = {
        id: user.id,
        business_name: editBusinessName || '',
        business_logo: newLogoUrl || '',
        tin: editTin || '',
        bank_account: editBankAccount || '',
        mobile_money: editMobileMoney || '',
        kyc_documents: newKycDocs,
        updated_at: new Date().toISOString(),
        kyc_status:
          (logoFile ||
            documentFiles.length > 0 ||
            editBusinessName !== profileData?.business_name ||
            editTin !== profileData?.tin ||
            editBankAccount !== profileData?.bank_account ||
            editMobileMoney !== profileData?.mobile_money) &&
          profileData?.kyc_status === 'not_started'
            ? 'submitted'
            : profileData?.kyc_status || 'not_started',
      };

      console.log('Profile updates:', profileUpdates);
      const { data, error: profileUpdateError } = await supabase
        .from('profiles')
        .upsert(profileUpdates, { onConflict: ['id'] });
      if (profileUpdateError) {
        setLocalError('Error updating profile: ' + profileUpdateError.message);
        setError('Error updating profile: ' + profileUpdateError.message);
        console.error('Profile update error:', profileUpdateError);
        return;
      }
      console.log('Profile update data:', data);

      const updatedProfile = { ...profileData, ...profileUpdates };
      setProfileData(updatedProfile);
      setProfile(updatedProfile);
      setUserName(editBusinessName || userName);
      setEditBusinessLogo(newLogoUrl);
      setLogoPreview(newLogoUrl);
      setEditKycDocuments(newKycDocs);
      setDocumentFiles([]);
      setNewPassword('');
      setConfirmPassword('');
      setIsEditing(false);
      setIsProfilePanelOpen(false);
      alert('Profile updated successfully!' + (uploadErrors.length > 0 ? ' Note: Some uploads failed.' : ''));
    } catch (err) {
      setLocalError('Unexpected error: ' + err.message);
      setError('Unexpected error: ' + err.message);
      console.error('Unexpected error in handleSaveProfile:', err);
    } finally {
      setIsLoading(false);
      if (logoPreview && logoFile) URL.revokeObjectURL(logoPreview);
    }
  };

  return (
    <div className="relative">
      <div
        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200"
        onClick={handleProfileClick}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
          <span className="text-white text-lg font-semibold">{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
        </div>
        <span className="text-gray-700 font-medium">Welcome, {userName || 'User'}</span>
      </div>
      {isProfilePanelOpen && (
        <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
          <div className="p-6 sm:p-8 h-full flex flex-col bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Vendor KYC Profile</h3>
              <button
                onClick={handleClosePanel}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-600">Loading profile...</p>
              </div>
            ) : fetchError ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-red-500 text-sm">{fetchError}</p>
              </div>
            ) : isEditing ? (
              <div className="flex-1 space-y-4 overflow-y-auto">
                {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    value={editBusinessName}
                    onChange={(e) => setEditBusinessName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter business name"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Logo</label>
                  {logoPreview ? (
                    <div className="relative mb-2">
                      <Image src={logoPreview} alt="Business Logo" width={80} height={80} className="rounded object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs"
                        disabled={isLoading}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-2">No logo uploaded</p>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">TIN</label>
                  <input
                    type="text"
                    value={editTin}
                    onChange={(e) => setEditTin(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter TIN"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Account</label>
                  <input
                    type="text"
                    value={editBankAccount}
                    onChange={(e) => setEditBankAccount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter bank account"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile Money</label>
                  <input
                    type="text"
                    value={editMobileMoney}
                    onChange={(e) => setEditMobileMoney(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter mobile money"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">KYC Documents (up to 5)</label>
                  {editKycDocuments.length > 0 ? (
                    <div className="mb-2">
                      {editKycDocuments.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <a href={doc} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            Document {index + 1}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeKycDocument(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            disabled={isLoading}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-2">No documents uploaded</p>
                  )}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/jpeg,image/png"
                    onChange={handleDocumentFilesChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isLoading}
                  />
                  {documentFiles.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{documentFiles.length} file(s) selected</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password (optional)</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleSaveProfile}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-2xl font-semibold">{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-800">{userName || 'User'}</h4>
                    <p className="text-gray-600 text-sm">Email: {userEmail || 'N/A'}</p>
                    <p className="text-gray-600 text-sm">Business: {profileData?.business_name || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Business Logo:</p>
                  {profileData?.business_logo ? (
                    <Image src={profileData.business_logo} alt="Business Logo" width={96} height={96} className="rounded object-cover" unoptimized />
                  ) : (
                    <p className="text-red-500 text-sm">Pending</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-600 text-sm">TIN:</p>
                  <p className={profileData?.tin ? 'text-gray-600 text-sm' : 'text-red-500 text-sm'}>
                    {profileData?.tin || 'Pending'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Bank Account:</p>
                  <p className={profileData?.bank_account ? 'text-gray-600 text-sm' : 'text-red-500 text-sm'}>
                    {profileData?.bank_account || 'Pending'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Mobile Money:</p>
                  <p className={profileData?.mobile_money ? 'text-gray-600 text-sm' : 'text-red-500 text-sm'}>
                    {profileData?.mobile_money || 'Pending'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">KYC Documents:</p>
                  {profileData?.kyc_documents && profileData.kyc_documents.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {profileData.kyc_documents.map((doc, index) => (
                        <li key={index}>
                          <a href={doc} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Document {index + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-500 text-sm">Pending</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-600 text-sm">KYC Status:</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(profileData?.kyc_status)}`}>
                    {profileData?.kyc_status || 'Not Started'}
                  </span>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
                  disabled={isLoading}
                >
                  Edit KYC Profile
                </button>
                <button
                  onClick={handleClosePanel}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg mt-3 font-medium hover:bg-gray-300 transition-all duration-200"
                  disabled={isLoading}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}