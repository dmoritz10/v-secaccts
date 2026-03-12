import {
  collection,
  doc,
  writeBatch,
  terminate,
  getFirestore,
  getCountFromServer,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { app, db } from '@/firebase';
import { auth, provider } from '@/firebase';
import { signInWithPopup } from 'firebase/auth';
import { alertDialog, promptDialog, confirmDialog, blockScreen, unblockScreen } from '@/ui/dialogState.js';

export async function restoreAllSheets() {
  let auditLog = [];

  try {
    // Add proper scope for reading & writing Sheets and reading drive
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');

    // Sign in with popup
    const userCredential = await signInWithPopup(auth, provider);
    const accessToken = userCredential._tokenResponse.oauthAccessToken;

    // Select sheet to restore from
    const selectedFile = await showPicker(accessToken);
    const ssId = selectedFile.id;

    const [ssName, sheets, SHEET_ID] = await getBackupSS(accessToken, ssId);

    if (!ssName) {
      alertDialog('Restore Database from Backup', sheets);
      return;
    }

    const confirmOk = await confirmDialog(
      '',
      `<strong>Restore Database from the ${ssName} spreadsheet </strong>contains the following sheets. 
        <br><br><strong>${sheets.join().replaceAll(',', '<br>')}</strong>
        <br><br>Each sheet will create a Collection with the same name in the database if it's not already present.
        <br><br>If the Collection is already in the database, it will be completely replaced by the contents of the sheet.
        <br>
        <br>Continue ?`
    );

    if (!confirmOk) return;

    blockScreen('Proceeding with restore ...');

    for (const sheetName of sheets) {
      const rtn = await restoreSheet(sheetName, accessToken, SHEET_ID);
      auditLog.push(rtn);
    }

    console.log('All sheets restored!');
  } catch (error) {
    console.error('Restore Failed', error);
    await alertDialog('Restore Failed', error);
    window.location.reload();
  }

  unblockScreen();
  const reportHtml = generateVerificationHtml(auditLog);
  await alertDialog('Restore Verification', reportHtml, { okText: 'Restart App' });
  window.location.reload();
}

async function getBackupSS(accessToken, ssId = null) {
  let SHEET_ID = null;
  if (!ssId) {
    SHEET_ID = await promptDialog('Restore Database from Backup', 'Enter ssId of spreadsheet to restore from', 'ss Id');
    if (SHEET_ID !== null) {
      console.log('User entered:', SHEET_ID);
    } else {
      return [null, 'Cancelled', null];
    }
  } else {
    SHEET_ID = ssId;
  }
  // Fetch sheet names
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return [null, `Invalid Restore Spreadsheet: ${res.status}`, null];

  const json = await res.json();
  const ssName = json.properties.title;
  const sheetNames = json.sheets.map((s) => s.properties.title);

  return [ssName, sheetNames, SHEET_ID];
}

async function restoreSheet(sheetName, accessToken, SHEET_ID) {
  // 1. Fresh start for the sheet
  await terminate(db);
  console.log('Waiting 5s for SDK cleanup...');
  await new Promise((res) => setTimeout(res, 5000));
  let currentDb = getFirestore(app);

  const rows = await fetchSheetData(sheetName, accessToken, SHEET_ID);
  const totalRows = rows.length - 1; // Exclude header
  let totalProcessed = 0;

  await clearCollection(sheetName, currentDb);

  // OPTIMIZED: Use a batch size of 25 (Safe middle ground)
  const BATCH_SIZE = 25;
  let batch = writeBatch(currentDb);
  let batchCounter = 0;

  console.log(`Starting restore for ${sheetName} (${totalRows} records)`);
  blockScreen(`Restoring ${sheetName}`);

  for (const row of rows) {
    const docId = row[0];
    if (!docId || docId === 'Document ID') continue;

    try {
      let data = JSON.parse(
        row
          .slice(1)
          .filter((c) => c !== '')
          .join('')
      );

      data = reconstructTimestamps(data);
      const docRef = doc(currentDb, sheetName, docId);

      batch.set(docRef, data);
      batchCounter++;
      totalProcessed++;

      // Commit Batch
      if (batchCounter >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(currentDb); // Start new batch
        batchCounter = 0;

        // UPDATE PROGRESS UI
        const percent = Math.round((totalProcessed / totalRows) * 100);
        blockScreen(`Restoring ${sheetName}: ${totalProcessed} / ${totalRows} (${percent}%)`);
      }

      // THE RESET: Every 500 docs, flush the SDK "straw"
      if (totalProcessed % 500 === 0) {
        console.log(`--- Flushing Stream at ${totalProcessed} ---`);
        await terminate(currentDb);
        currentDb = getFirestore(app);
        batch = writeBatch(currentDb); // Re-link batch to the new instance
        await new Promise((res) => setTimeout(res, 1000));
      }
    } catch (error) {
      console.error(`FAILURE at ${totalProcessed}:`, error);
      throw new Error('Restore halted to preserve accuracy.');
    }
  }

  // Final partial batch commit
  if (batchCounter > 0) {
    await batch.commit();
  }

  const coll = collection(currentDb, sheetName);
  const snapshot = await getCountFromServer(coll);

  console.log(
    `Confirming restore for ${sheetName} ${totalRows} rows in sheet -  ${snapshot.data().count} documents in Collection`
  );

  return { sheetName: sheetName, sheetCount: totalRows, docCount: snapshot.data().count };
}

function reconstructTimestamps(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  for (const key in obj) {
    const value = obj[key];

    // Check for our explicit flag first
    if (value && typeof value === 'object' && value._isTimestamp === true) {
      // Reconstruct and REPLACE the flagged object with a real Timestamp
      obj[key] = new Timestamp(value.seconds, value.nanoseconds);
    }
    // Otherwise, if it's a normal object/array, keep digging
    else if (typeof value === 'object') {
      reconstructTimestamps(value);
    }
  }
  return obj;
}

async function fetchSheetData(sheetName, accessToken, SHEET_ID) {
  // CHANGE: Grab A through Z to catch all potential JSON segments (B, C, D...)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Sheets API Error: ${res.status} - ${errorBody}`);
  }

  const data = await res.json();

  const rows = data.values ? data.values : [];

  return rows;
}

async function clearCollection(colName, db) {
  const colRef = collection(db, colName);
  const snapshot = await getDocs(colRef);

  if (snapshot.empty) return;

  // Process in chunks of 500 to prevent Firestore "choking"
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Batch delete: cleared items ${i} to ${Math.min(i + 500, docs.length)}`);
  }
}

const generateVerificationHtml = (results) => {
  // Define some basic inline styles for the table
  const tableStyle = `style="width:100%; border-collapse: collapse; margin-top: 10px; font-family: sans-serif;"`;
  const thStyle = `style="border-bottom: 2px solid #ddd; text-align: left; padding: 8px; background-color: #f2f2f2;"`;
  const tdStyle = `style="border-bottom: 1px solid #ddd; padding: 8px;"`;

  let html = `<strong>Restore Verification Report</strong><br>`;
  html += `<table ${tableStyle}>
            <thead>
              <tr>
                <th ${thStyle}>Collection</th>
                <th ${thStyle}>Sheet Rows</th>
                <th ${thStyle}>Firestore</th>
                <th ${thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>`;

  results.forEach((res) => {
    const isMatch = res.sheetCount === res.docCount;
    const statusColor = isMatch ? 'green' : 'red';
    const statusIcon = isMatch ? '✅' : '❌';

    html += `<tr>
              <td ${tdStyle}>${res.sheetName}</td>
              <td ${tdStyle}>${res.sheetCount}</td>
              <td ${tdStyle}>${res.docCount}</td>
              <td ${tdStyle} style="color: ${statusColor}; font-weight: bold;">
                ${statusIcon} ${isMatch ? 'Match' : 'Mismatch'}
              </td>
            </tr>`;
  });

  html += `</tbody></table>`;

  if (results.some((res) => res.sheetCount !== res.docCount)) {
    html += `<br><strong style="color: red;">Warning: Some counts do not match.</strong>`;
  }

  return html;
};

export async function verifyRestore(colNameA, colNameB) {
  console.log(`🔍 Comparing ${colNameA} vs ${colNameB}...`);

  const getFreshDocs = async (name) => {
    const colRef = collection(db, name);
    // Passing 'server' as the second argument forces a network fetch
    return await getDocs(colRef, 'server');
  };

  const [snapshotA, snapshotB] = await Promise.all([getFreshDocs(colNameA), getFreshDocs(colNameB)]);

  const dataA = {};
  snapshotA.forEach((doc) => (dataA[doc.id] = doc.data()));
  const dataB = {};
  snapshotB.forEach((doc) => (dataB[doc.id] = doc.data()));

  const allIds = new Set([...Object.keys(dataA), ...Object.keys(dataB)]);

  const results = [];
  let nbrErrs = 0;

  allIds.forEach((id) => {
    const docA = dataA[id];
    const docB = dataB[id];
    let diffs = [];

    if (!docA || !docB) {
      console.log('missing', id, docA, docB);
      nbrErrs++;
      const missingIn = !docA ? colNameA : colNameB;
      diffs.push(`Document missing in ${missingIn}`);
      results.push({ id, status: '⚠️ Mismatch', details: diffs.join('<br>') });
      return; // This return just exits the current ID's loop, which is correct
    }

    const allKeys = new Set([...Object.keys(docA), ...Object.keys(docB)]);
    allKeys.forEach((key) => {
      const valA = docA[key];
      const valB = docB[key];

      // Use the stable version to ignore property order
      if (stableStringify(valA) !== stableStringify(valB)) {
        diffs.push(`<b>${key}:</b> Data mismatch`);
      }
    });

    if (diffs.length > 0) {
      nbrErrs++;
      const status = '⚠️ Mismatch';
      results.push({ id, status, details: diffs.join('<br>') });
    }
  });

  // 2. CRITICAL: This must be OUTSIDE the allIds.forEach loop
  console.log(`Audit complete. Found ${results.length} total results with ${nbrErrs} documents with errors.`);
console.log(results)
//   const tableRows = results
//     .map(
//       (res) => `
//   <tr>
//     <td style="border: 1px solid #ddd; padding: 8px;">${res.id}</td>
//     <td style="border: 1px solid #ddd; padding: 8px;">${res.status}</td>
//     <td style="border: 1px solid #ddd; padding: 8px;">${res.details}</td>
//   </tr>
// `
//     )
//     .join('');

//   // Wrap those rows in your table headers
//   const reportHtml = `
//   <table style="width:100%; border-collapse: collapse;">
//     <thead>
//       <tr style="background-color: #f2f2f2;">
//         <th>ID</th>
//         <th>Status</th>
//         <th>Details</th>
//       </tr>
//     </thead>
//     <tbody>
//       ${tableRows}
//     </tbody>
//   </table>
// `;
//   return reportHtml;
}

const stableStringify = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const result = sortedKeys.map((key) => {
    return JSON.stringify(key) + ':' + stableStringify(obj[key]);
  });
  return '{' + result.join(',') + '}';
};

/**
 * Shows the Google File Picker to select a Spreadsheet
 * @param {string} accessToken - From your Firebase/Google login
 * @returns {Promise} - Resolves with {id, name}
 */
export async function showPicker(accessToken) {
  return new Promise((resolve, reject) => {
    // 1. Ensure GAPI is available
    if (typeof gapi === 'undefined') {
      return reject('Google API client not loaded');
    }

    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    // Calculate a "Safe" size (90% of screen to allow for your PWA's margins)
    const pickerWidth = viewWidth > 800 ? 800 : viewWidth * 0.95;
    const pickerHeight = viewHeight > 600 ? 600 : viewHeight * 0.85;

    gapi.load('picker', {
      callback: () => {
        // 1. Keep the view simple. Google usually defaults to 'Last Modified'
        const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
          .setMimeTypes('application/vnd.google-apps.spreadsheet')
          .setMode(google.picker.DocsViewMode.LIST);

        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .enableFeature(google.picker.Feature.NAV_HIDDEN)
          .setOAuthToken(accessToken)
          .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
          .setOrigin(window.location.origin)
          .setSize(pickerWidth, pickerHeight)
          .setCallback((data) => {
            if (data.action === google.picker.Action.PICKED) {
              const file = data[google.picker.Response.DOCUMENTS][0];
              resolve({ id: file.id, name: file.name });
            }
          })
          .build();

        picker.setVisible(true);

        // 1. Create a "Watcher" that forces the alignment every time the Picker appears
        const observer = new MutationObserver((mutations) => {
          const pickerDialog = document.querySelector('.picker-dialog');
          const pickerBg = document.querySelector('.picker-dialog-bg');

          if (pickerDialog) {
            pickerDialog.style.setProperty('transform', 'none', 'important');
            pickerDialog.style.setProperty('top', '0px', 'important'); // Force to top
            pickerDialog.style.setProperty('position', 'fixed', 'important');
            pickerDialog.style.setProperty('z-index', '10001', 'important');
          }

          if (pickerBg) {
            pickerBg.style.setProperty('z-index', '10000', 'important');
          }
        });

        // 2. Start watching the body for the Picker being added to the DOM
        observer.observe(document.body, { childList: true, subtree: true });
      },
    });
  });
}
