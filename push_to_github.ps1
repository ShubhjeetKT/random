Set-Location "$PSScriptRoot"

$git = "C:\Users\tiwari.sk\tools\mingit\cmd\git.exe"

& $git init
& $git add .
& $git commit -m "Initial commit"
& $git branch -M main
& $git remote remove origin 2>$null
& $git remote add origin https://github.com/ShubhjeetKT/random.git
& $git push -u origin main
