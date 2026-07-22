$modelsDir = "c:\Users\zeelk\OneDrive\Desktop\CodingGita_SeatOS\frontend\public\models"
New-Item -ItemType Directory -Force -Path $modelsDir

$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/"
$files = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

foreach ($file in $files) {
    $url = $baseUrl + $file
    $dest = Join-Path -Path $modelsDir -ChildPath $file
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $dest
}

Write-Host "All models downloaded successfully!"
