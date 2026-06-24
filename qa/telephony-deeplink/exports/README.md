# Qase Exports

This directory is for generated Qase import files.

Run:

```sh
node qa/scripts/export-qase-csv.mjs qa/telephony-deeplink
```

The script writes `qase-import.csv`. Import it in Qase with source type `Qase.io`.

Do not hand-edit generated CSV files. Edit the Markdown flows, validate them, and export again.
