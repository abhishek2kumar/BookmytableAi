const fs = require('fs');

let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf-8');

content = content.replace(
`      if (newUserId) {
        await updateDoc(doc(db, 'restaurants', selectedRes.id), {
          partnerEmails: [...(selectedRes.partnerEmails || []), newStaffForm.email],
          updatedAt: serverTimestamp()
        });
      }`,
`      if (newUserId) {
        const updatedEmails = [...(selectedRes.partnerEmails || []), newStaffForm.email];
        await updateDoc(doc(db, 'restaurants', selectedRes.id), {
          partnerEmails: updatedEmails,
          updatedAt: serverTimestamp()
        });
        setSelectedRes(prev => prev ? { ...prev, partnerEmails: updatedEmails } : null);
        setRestaurants(prev => prev.map(r => r.id === selectedRes.id ? { ...r, partnerEmails: updatedEmails } : r));
      }`
);

content = content.replace(
`    const newEmails = (selectedRes.partnerEmails || []).filter(e => e !== emailToRemove);
    try {
      await updateDoc(doc(db, 'restaurants', selectedRes.id), {
        partnerEmails: newEmails,
        updatedAt: serverTimestamp()
      });
      setNotification({ type: 'success', message: 'Staff access removed.' });`,
`    const newEmails = (selectedRes.partnerEmails || []).filter(e => e !== emailToRemove);
    try {
      await updateDoc(doc(db, 'restaurants', selectedRes.id), {
        partnerEmails: newEmails,
        updatedAt: serverTimestamp()
      });
      setSelectedRes(prev => prev ? { ...prev, partnerEmails: newEmails } : null);
      setRestaurants(prev => prev.map(r => r.id === selectedRes.id ? { ...r, partnerEmails: newEmails } : r));
      setNotification({ type: 'success', message: 'Staff access removed.' });`
);

fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
