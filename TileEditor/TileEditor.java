import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.Date;
import java.util.Random;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;

import javax.imageio.ImageIO;
import java.awt.geom.*;
import javax.swing.filechooser.*;

class Point {
	public int x;
	public int y;

	public Point(int x, int y) {
		this.x = x;
		this.y = y;
	}

	public void setPosition(int x, int y) {
		this.x = x;
		this.y = y;
	}
}

class Entity extends Point {
	public BufferedImage image;
	private int tile_size = 32;

	public Entity(int x, int y, String filename, int tile_size) {
		super(x, y);

		try {
			image = ImageIO.read (new File (filename));
		} catch (IOException e){
			System.out.println ("Error loading file " + filename);
		}
	}

	public void render(Graphics g, int offsetX, int offsetY) {
		g.drawImage (image, (x + offsetX)*tile_size, (y + offsetY)*tile_size, null);
	}

	public boolean isDefined() {
		return (x != -1 && y != -1);
	}
}

public class TileEditor extends JPanel implements KeyListener, MouseListener, MouseMotionListener, ActionListener {
	public final int WINDOW_WIDTH = 1280;
	public final int WINDOW_HEIGHT = 1040;
	public int TILE_SIZE = 32;
	
	protected JTextField 	txtMapName;
	protected JTextField 	txtMapWidth;
	protected JTextField	txtMapHeight;
	protected JTextField	txtTileSetName;
	protected JTextField	txtTileSize;
	
	protected JLabel 		lblMapName;
	protected JLabel		lblMapWidth;
	protected JLabel		lblMapHeight;
	protected JLabel		lblTileSetName;
	protected JLabel		lblTileSize;
	
	protected JLabel		lblInfo;
	
	protected JButton		btnCreateMap;
	protected JButton		btnOpenMap;
	protected JButton		btnBack;
	
	protected JFileChooser	fileChooser;
	
	public int MAP_WIDTH = 1000;
	public int MAP_HEIGHT = 1000;
	
	boolean show = false;
	int lastTile = 0;
	
	public enum ApplicationStates { Start, New, Load, Editor };
	
	public ApplicationStates currentState = ApplicationStates.Start;
	
	int cursorX = 0, cursorY = 0;
	
	boolean ctrlPressed = false;
	
	public final int MAX_TILESETS = 20;
	public final int MAX_LAYERS = 5;
	
	public int map[][][] = new int[MAX_LAYERS][(MAP_WIDTH) + 1][(MAP_HEIGHT) + 1];
	
	BufferedImage tileSet[] 	  = new BufferedImage[MAX_TILESETS];
	String			tileSetPath[] = new String [MAX_TILESETS];
	int	numTilesInSet[] = new int[MAX_TILESETS];
	int tileProperties[] = new int[MAX_TILESETS * 40];
	public int tileSetsLoaded = 0;
	int totalTiles;
	
	BufferedImage leftArrow;
	BufferedImage rightArrow;
	BufferedImage backgroundImage;
	BufferedImage plusButton;
	BufferedImage minusButton;
	
	public int offsetX = 0, offsetY = 0;
	public int tileBarOffset = 0;
	
	int currentTile = 0;
	int currentLayer = 1;

	Entity ball = new Entity(-1, -1, "ball.png", TILE_SIZE);
	Entity teamOneGoal = new Entity(-1, -1, "goal.png", TILE_SIZE);
	Entity teamTwoGoal = new Entity(-1, -1, "goal.png", TILE_SIZE);
	
	public String mapName = "";
	
	public boolean shiftPressed = false;
	int bulkStartX = -1, bulkStartY = -1;
	
	FontMetrics fm;
	
	Color extraTileColor[] = { new Color(255,15,15,127), new Color(42,115,234,127), new Color(255, 167, 127), new Color(148, 190, 0), new Color(57, 190, 0) };
	
	public TileEditor () {
		setFocusable (true);
		setFocusTraversalKeysEnabled (false);
		setOpaque(true);

      	this.requestFocus();
		
		addKeyListener (this);
		addMouseListener (this);
		addMouseMotionListener (this);
		
		setMinimumSize (getPreferredSize ());
		setMaximumSize (getPreferredSize ());
		
		System.out.println (System.getProperty ("user.dir"));
		
		try {
			leftArrow = ImageIO.read (new File ("left_arrow.png"));
			rightArrow = ImageIO.read (new File ("right_arrow.png"));
			plusButton = ImageIO.read (new File ("plus.png"));
			minusButton = ImageIO.read (new File ("minus.png"));
		} catch (IOException e){
			System.out.println ("Error loading tileset.");
		}
		
		txtMapName = new JTextField (10);
		txtMapWidth = new JTextField (5);
		txtMapHeight = new JTextField (5);
		txtTileSize = new JTextField (5);
		
		lblMapName = new JLabel ("Enter Map Name:");
		lblMapWidth = new JLabel ("Width:");
		lblMapHeight = new JLabel ("Height:");

		lblInfo = new JLabel ("");
		lblInfo.setForeground(Color.RED);
		lblTileSize = new JLabel ("Tile Size:");
		
		btnCreateMap = new JButton ("Create New Map");
		btnCreateMap.setActionCommand ("new");
		btnCreateMap.addActionListener (this);
		
		btnOpenMap = new JButton ("Load Existing Map");
		btnOpenMap.setActionCommand ("load");
		btnOpenMap.addActionListener (this);
		
		btnBack = new JButton ("Back");
		btnBack.setActionCommand ("back");
		btnBack.addActionListener (this);
		
		fileChooser = new JFileChooser ();
		
		setLayout (new GridBagLayout ());
	}
	
	public Dimension getPreferredSize() {
		return new Dimension(WINDOW_WIDTH,WINDOW_HEIGHT);
	}
	
	public Dimension getSize () {
		return new Dimension(WINDOW_WIDTH,WINDOW_HEIGHT);
	}
	
	@Override 
	public void paintComponent (Graphics g)
	{
		g.setColor (Color.WHITE);
		g.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

		g.setColor (Color.BLACK);
		
		fm = g.getFontMetrics ();
		
		if (currentState == ApplicationStates.Editor) {
			if (backgroundImage != null)
				g.drawImage (backgroundImage, 0, 0, null);
			
			for (int l = 0; l < MAX_LAYERS; l++) {
				for (int y = 0; y < (int)(MAP_WIDTH); y ++){
					for (int x = 0; x < (int)(MAP_HEIGHT); x++) {
						if (Math.abs(map[l][x][y]) != 0 && x * TILE_SIZE + offsetX * TILE_SIZE < WINDOW_WIDTH && y * TILE_SIZE + offsetY * TILE_SIZE < WINDOW_HEIGHT - TILE_SIZE) {
							drawTile (Math.abs(map[l][x][y]), x * TILE_SIZE, y * TILE_SIZE, g, true);
						}
						if (currentLayer == 0 && map[0][x][y] > 0 && map[0][x][y] < extraTileColor.length) {
							g.setColor (extraTileColor[map[0][x][y] - 1]);
							g.fillRect (x * TILE_SIZE + offsetX * TILE_SIZE, y * TILE_SIZE + offsetY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
							g.setColor (Color.BLACK);
						}
					}
				}
			}

			if (ball.isDefined())
				ball.render(g, offsetX, offsetY);

			if (teamOneGoal.isDefined())
				teamOneGoal.render(g, offsetX, offsetY);

			if (teamTwoGoal.isDefined())
				teamTwoGoal.render(g, offsetX, offsetY);
				
			// fill fields outside the playzone with black 
			for (int y = 0; y <= (int)(WINDOW_HEIGHT / TILE_SIZE) + 1; y++) {
				for (int x = 0; x <= (int)(WINDOW_WIDTH / TILE_SIZE) + 1; x++) {
					if (x - offsetX < 0 || y - offsetY < 0 || x - offsetX >= MAP_WIDTH || y - offsetY >= MAP_HEIGHT)
						g.fillRect (x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				}
			}
		
			// draw cursor
			if (show) {
				if (bulkStartX == -1 && bulkStartY == -1) {
					if (currentLayer == 0) {
						g.setColor (extraTileColor[currentTile - 1]);
						g.fillRect (cursorX, cursorY, TILE_SIZE, TILE_SIZE);
						g.setColor (Color.BLACK);
					} else
						drawTile (currentTile, cursorX, cursorY, g, false);
				}
				else { // shift is pressed -> fill range with tiles
					int sa = cursorX / TILE_SIZE, sb = cursorY / TILE_SIZE;
					int ea = bulkStartX, eb = bulkStartY;
					int distX = bulkStartX - cursorX / TILE_SIZE;
					int distY = bulkStartY - cursorY / TILE_SIZE;
					
					if (distX < 0) {
						distX *= -1;
						sa = bulkStartX;
						ea = cursorX / TILE_SIZE;
					}
					
					if (distY < 0) {
						distY *= -1;
						sb = bulkStartY;
						eb = cursorY / TILE_SIZE;
					}
					
					for (int a = sa; a <= ea; a++) {
						for (int b = sb; b <= eb; b++) {
							drawTile (currentTile, a * TILE_SIZE, b * TILE_SIZE, g, false);
						}
					}
				}
			}
			
			// TOOLS PANEL
			// paint tile bar
			g.setColor (Color.WHITE);
			g.fillRect (0, WINDOW_HEIGHT - TILE_SIZE - 20, WINDOW_WIDTH, TILE_SIZE + 20);
			
			int counter = tileBarOffset + 1;
					for (int c = 0; c <= WINDOW_WIDTH / TILE_SIZE; c++) {
						if (c == 0 && tileBarOffset == 0)
							c = 1;
						if (counter <= totalTiles) {
							drawTile (counter, c * TILE_SIZE, WINDOW_HEIGHT - TILE_SIZE, g, false);
							
							if (tileProperties[counter] != 0) {
								g.setColor (extraTileColor[tileProperties[counter]]);
								g.fillRect (c * TILE_SIZE, WINDOW_HEIGHT - TILE_SIZE, TILE_SIZE, TILE_SIZE);
								g.setColor (Color.BLACK);
							}
						}
						counter ++;
				}

			g.setColor (Color.BLACK);
			
			for (int i = 1; i <= (int)(WINDOW_WIDTH/TILE_SIZE); i++)
				g.drawLine (i * TILE_SIZE, WINDOW_HEIGHT - TILE_SIZE, i * TILE_SIZE, WINDOW_HEIGHT);
			
			g.drawLine (0, WINDOW_HEIGHT - TILE_SIZE, WINDOW_WIDTH, WINDOW_HEIGHT - TILE_SIZE);
			
			g.drawImage (rightArrow, WINDOW_WIDTH - 20, WINDOW_HEIGHT - TILE_SIZE - 20, null);
			if (tileBarOffset > 0)
				g.drawImage (leftArrow, 0, WINDOW_HEIGHT - TILE_SIZE - 20, null);
			
			g.drawString ("Layer " + currentLayer, 55, WINDOW_HEIGHT - TILE_SIZE - ((20 - fm.getHeight ())));
			g.drawImage (plusButton, 45 + g.getFontMetrics ().stringWidth ("Layer + " + currentLayer), WINDOW_HEIGHT - TILE_SIZE - 20, null);
			g.drawImage (minusButton, 30, WINDOW_HEIGHT - TILE_SIZE - 20, null);
		}
	}
	
	@Override
	public void keyPressed (KeyEvent e)
	{
		int key = e.getKeyCode ();
		System.out.println(key);
		
		if (currentState == ApplicationStates.Editor) {
			if (key == KeyEvent.VK_CONTROL) //ctrl
				ctrlPressed = true;
		
			if (key == KeyEvent.VK_S && ctrlPressed == true) // ctrl + s
				saveFile (mapName);
		
			if (key == KeyEvent.VK_LEFT) {// left arrow
				offsetX++;
				repaint ();
			}
			if (key == KeyEvent.VK_UP) {// up arrow
				offsetY++;
				repaint ();
			}
			if (key == KeyEvent.VK_RIGHT) {// right arrow
				offsetX--;
				repaint ();
			}
			if (key == KeyEvent.VK_DOWN) { // down arrow
				offsetY--;
				repaint ();
			}
			
			if (key == KeyEvent.VK_C) { // c
				if (currentLayer == 0) {
					currentTile ++;
					
					if (currentTile >= extraTileColor.length) {
						currentLayer = 1;
						currentTile = lastTile;
					}
				}
				else {
					lastTile = currentTile;
					currentTile = 1;
					currentLayer = 0;
				}
				
				repaint ();
			}
			
			if (key == KeyEvent.VK_ESCAPE) { // escape
				currentState = ApplicationStates.New;
				
				txtMapName = new JTextField (10);
				txtMapName.addActionListener (this);
				txtMapName.setLocation (50, 70);
		
				lblMapName = new JLabel ("Enter Map Name:");
				lblMapName.setLocation (50, 20);
		
				add (lblMapName);
				add (txtMapName);
				add (btnBack);
				
				revalidate ();
				map = new int[MAX_LAYERS][(MAP_WIDTH) + 1][(MAP_HEIGHT) + 1];
				repaint ();
			}
			
			if (key == KeyEvent.VK_SHIFT) { // shift
				shiftPressed = true;
			}
		}

		repaint();
	}
	
	public void loadTileSet (String filename, String path) {
		System.out.println("loading tileset " + filename);

		if(path.length() != 0)
			filename = path + "\\" + filename;
		try {
			tileSet[tileSetsLoaded + 1] = ImageIO.read (new File (filename));
		} catch (IOException e){
			System.out.println ("error loading tileset.");
		}
		if (tileSet[tileSetsLoaded + 1].getWidth () % TILE_SIZE == 0 && tileSet[tileSetsLoaded + 1].getHeight() % TILE_SIZE == 0){
			tileSetsLoaded ++;
			numTilesInSet[tileSetsLoaded] = (int)(tileSet[tileSetsLoaded].getWidth () / TILE_SIZE) * (int) (tileSet[tileSetsLoaded].getHeight () / TILE_SIZE);
			totalTiles += numTilesInSet[tileSetsLoaded];
			tileSetPath[tileSetsLoaded] = filename;
			System.out.println ("tiles in set: " + numTilesInSet [tileSetsLoaded]);
		} else {
			System.out.println ("tileset has wrong dimensions!");
		}
	}
	
	public void drawTile (int tileIndex, int x, int y, Graphics g, boolean useOffset) {
		if (tileIndex == 0 || tileIndex > totalTiles)
			return;
		
		int tileSetId = 0, tileInSet = 0;
		for (int i = 1; i <= tileIndex; i ++) {
			if (tileInSet > numTilesInSet[tileSetId] - 1) {
				tileSetId++;
				tileInSet = 1;
			} else
				tileInSet++;
		}
		
		int tilesX = (int)(tileSet[tileSetId].getWidth () / TILE_SIZE);
		int inX = tileInSet % tilesX;
		int inY = (int)(tileInSet / tilesX);
		inY++;
		
		if (inX == 0) {
			inX = tilesX;
			inY --;
		}
		
		if (useOffset)
			g.drawImage (tileSet[tileSetId], x + offsetX * TILE_SIZE, y + offsetY * TILE_SIZE, x + TILE_SIZE + offsetX * TILE_SIZE, y + TILE_SIZE + offsetY * TILE_SIZE, TILE_SIZE * (inX - 1), TILE_SIZE * (inY - 1), TILE_SIZE * inX, TILE_SIZE * inY, null);
		else
			g.drawImage (tileSet[tileSetId], x, y, x + TILE_SIZE, y + TILE_SIZE, TILE_SIZE * (inX - 1), TILE_SIZE * (inY - 1), TILE_SIZE * inX, TILE_SIZE * inY, null);
	}
	
	@Override
	public void keyReleased (KeyEvent e)
	{
		int key = e.getKeyCode ();
		
		if (key == 17)
			ctrlPressed = false;
		
		if (key == 16) {
			shiftPressed = false;
			bulkStartX = -1; 
			bulkStartY = -1;
		}

		repaint();
	}
	
	@Override
	public void keyTyped (KeyEvent e) {
		
	}
	
	@Override
	public void mousePressed(MouseEvent e) {
		updateCursor (e);
		placeRemoveTile (e);
		
		if (e.getY () > WINDOW_HEIGHT - TILE_SIZE) {
			int selTile = cursorX / TILE_SIZE + tileBarOffset; 
			
			if (tileBarOffset > 0)
				selTile ++;
			
			if (selTile > totalTiles)
				selTile = 0;
			
			if (selTile < 0)
				selTile = 0;
			
			if (currentLayer != 0) 
				currentTile = selTile;
			else
				tileProperties[selTile] = (tileProperties[selTile] == currentTile) ? 0 : currentTile;
		}
		
		// one of the arrows clicked?
		if (e.getY () > WINDOW_HEIGHT - TILE_SIZE - 20 && e. getY () < WINDOW_HEIGHT - TILE_SIZE) {
			if (e.getX () < 20) { // left arrow
				if (tileBarOffset > 0)
					tileBarOffset -= (int)(WINDOW_WIDTH / TILE_SIZE);
			}
			if (e.getX () > WINDOW_WIDTH - 20)
				tileBarOffset += (int)(WINDOW_WIDTH / TILE_SIZE);
			
			repaint ();
		}
		
		// plus or minus button clicked?
		if (e.getY () > WINDOW_HEIGHT - TILE_SIZE - 20 && e.getY () < WINDOW_HEIGHT - TILE_SIZE){
			// plus button
			if (e.getX () > 45 + fm.stringWidth ("Layer + " + currentLayer) && e. getX () < 65 + fm.stringWidth ("Layer + " + currentLayer)) {
				if (currentLayer < MAX_LAYERS)
					currentLayer++;
				repaint ();
			}
			
			// minus button
			if (e.getX () > 30 && e.getX () < 50) {
				if (currentLayer > 1)
					currentLayer--;
				repaint ();
			}
		}
		
		repaint ();
	}

	@Override
	public void mouseReleased(MouseEvent e) {
		if (shiftPressed && bulkStartX != -1 && bulkStartY != -1) {
			int sa = cursorX / TILE_SIZE, sb = cursorY / TILE_SIZE;
			int ea = bulkStartX, eb = bulkStartY;
			int distX = bulkStartX - cursorX / TILE_SIZE;
			int distY = bulkStartY - cursorY / TILE_SIZE;
			
			if (distX < 0) {
				distX *= -1;
				sa = bulkStartX;
				ea = cursorX / TILE_SIZE;
			}
			
			if (distY < 0) {
				distY *= -1;
				sb = bulkStartY;
				eb = cursorY / TILE_SIZE;
				
				if (cursorY > WINDOW_HEIGHT - TILE_SIZE)
					eb--;
			}
			
			for (int b = sb; b <= eb; b++) {
				for (int a = sa; a <= ea; a++) {
					map[currentLayer][a - offsetX][b - offsetY] = currentTile;
				}
			}
			
			repaint ();
		}
		
		bulkStartX = -1;
		bulkStartY = -1;
		repaint();
	}

	@Override
	public void mouseEntered(MouseEvent e) {
	 	show = true;
	}
	
	@Override
	public void mouseExited(MouseEvent e) {
		show = false;
	}

	@Override
	public void mouseClicked(MouseEvent e) {
		
	}
	
	@Override
	public void mouseMoved (MouseEvent e) {
		updateCursor (e);
		
		repaint ();
	}
	
	@Override
	public void mouseDragged (MouseEvent e) {
		updateCursor (e);
		
		if (shiftPressed && bulkStartX == -1 & bulkStartY == -1) {
			bulkStartX = (int)(e.getX () / TILE_SIZE);
			bulkStartY = (int)(e.getY () / TILE_SIZE);
		} else if (!shiftPressed)
			placeRemoveTile (e);
			
		repaint ();
	}
	
	public void run () {
		repaint();
	}
	
	public void placeRemoveTile (MouseEvent e) {
		System.out.println (currentTile);
		if (e.getX () < 0 || e.getY () < 0 || e.getX () >= WINDOW_WIDTH || e.getY () >= WINDOW_HEIGHT - TILE_SIZE - 20)
			return;
		
		int x = 0, y = 0;
		x = (int)(e.getX () / TILE_SIZE) - offsetX;
		y = (int)(e.getY () / TILE_SIZE) - offsetY;
		
		if (x < 0 || y < 0 || x > MAP_WIDTH || y > MAP_HEIGHT)
			return;
		
		if (e.getButton () == MouseEvent.BUTTON1) {
			if (currentLayer == 0 && map[currentLayer][x][y] == currentTile)
				map[currentLayer][x][y] = 0;
			else {
				map[currentLayer][x][y] = currentTile;
				map[0][x][y] = tileProperties[currentTile];
			}
		}
		else if (e.getButton () == MouseEvent.BUTTON3) {
			map[currentLayer][x][y] = 0;
			show = false;
		}
	}
	
	public void actionPerformed(ActionEvent evt) {
		repaint ();
		
		if ("save".equals (evt.getActionCommand ()) && currentState == ApplicationStates.Editor) 
			saveFile (mapName);
		
		if ("loadBackground".equals (evt.getActionCommand ()) && currentState == ApplicationStates.Editor) {
			fileChooser.setCurrentDirectory (new File (System.getProperty ("user.dir") + "/"));
			fileChooser.showOpenDialog (this);
			
			try {
				if (fileChooser.getSelectedFile () != null)
					backgroundImage = ImageIO.read (new File (fileChooser.getSelectedFile ().getName ()));
			} catch (Exception IOException) {
				System.out.println ("Error loading background file " + fileChooser.getSelectedFile ().getAbsolutePath ());
			}
		}
		
		if ("close".equals (evt.getActionCommand ()) && currentState == ApplicationStates.Editor) {
			currentState = ApplicationStates.Start;
			
			removeAll ();
			revalidate ();
			
			for (int m = 0; m <= tileSetsLoaded; m++) {
				tileSet[m] = null;
				numTilesInSet[m] = 0;
			}
			
			tileSetsLoaded = 0;
			totalTiles = 0;
			repaint ();
			return;
		}
		
		if ("loadTileset".equals (evt.getActionCommand ())) {
			fileChooser.showOpenDialog (this);
			
			if (fileChooser.getSelectedFile () != null)
				loadTileSet (fileChooser.getSelectedFile ().getName (), "");
			return;
		}
		
		if (currentState == ApplicationStates.Start) {
			GridBagConstraints c = new GridBagConstraints ();
			
			remove (btnCreateMap);
			remove (btnOpenMap);
			
			revalidate ();
			
			if ("new".equals (evt.getActionCommand ())) {
				c.fill = GridBagConstraints.HORIZONTAL;
				c.gridx = 0;
				c.gridy = 0;
				add (lblMapName, c);
		
				c.gridx = 1;
				add (txtMapName, c);
		
				c.gridx = 0;
				c.gridy = 1;
		
				add (lblMapWidth, c);
		
				c.gridx = 1;
				add (txtMapWidth, c);
		
				c.gridx = 0;
				c.gridy = 2;
				add (lblMapHeight, c);
		
				c.gridx = 1;
				add (txtMapHeight, c);
				
				c.gridx = 0;
				c.gridy = 3;
				add (lblTileSize, c);
				
				c.gridx = 1;
				add (txtTileSize, c);
		
				c.gridx = 1;
				c.gridy = 4;
				add (btnCreateMap, c);
				
				c.gridy = 6;
				c.gridx = 0;
				add (lblInfo, c);
				
				repaint ();
				
				currentState = ApplicationStates.New;
			}
		} 
		
		else if (currentState == ApplicationStates.New) {
			
			if ("back".equals (evt.getActionCommand ())) {
				currentState = ApplicationStates.Start;
				
				removeAll ();
				
				revalidate ();
				repaint ();
				return;
			}
			
			String file = System.getProperty ("user.dir") + "/" + txtMapName.getText() + ".txt";
			
			File f = new File (file);
			mapName = txtMapName.getText() + ".txt";
			
			if (f.exists ()) {
				lblInfo.setText("Map with this name already exists!");
			} else if (txtMapWidth.getText ().length () == 0 || txtMapHeight.getText ().length () == 0 || txtTileSize.getText ().length() == 0 || mapName.length() == 0) {
				lblInfo.setText("Please fill out all textfields!");
			} else {
				currentState = ApplicationStates.Editor;
				
				MAP_WIDTH = Integer.parseInt (txtMapWidth.getText ());
				MAP_HEIGHT = Integer.parseInt (txtMapHeight.getText ());
				TILE_SIZE = Integer.parseInt (txtTileSize.getText ());
				
				removeAll ();
				revalidate ();
			
				if (MAP_HEIGHT > (int)(WINDOW_HEIGHT / TILE_SIZE))
					offsetY = (MAP_HEIGHT - (int)(WINDOW_HEIGHT / TILE_SIZE)) * -1;
				
				revalidate ();
				repaint ();
			
				requestFocus();
			}
		}
		
		if ("open".equals (evt.getActionCommand ())) {
			
			fileChooser.setCurrentDirectory (new File (System.getProperty ("user.dir") + "/"));
			fileChooser.showOpenDialog (this);
		
			if (fileChooser.getSelectedFile () != null) {
				loadFile (fileChooser.getSelectedFile ().getAbsolutePath ());
				
				currentState = ApplicationStates.Editor;	
				removeAll ();
				revalidate ();
				repaint ();
			}
		}
	}
	
	public void updateCursor (MouseEvent e) {
		cursorX = e.getX ();
		cursorY = e.getY ();
		
		cursorX = (int)(cursorX / TILE_SIZE);
		cursorY = (int)(cursorY / TILE_SIZE);
		
		cursorX *= TILE_SIZE;
		cursorY *= TILE_SIZE;
		
		show = true;
		repaint();
	}
	
	public void saveFile (String fileName) {
		try {
			FileWriter w = new FileWriter (fileName, false);
			PrintWriter pW = new PrintWriter (w);
			
			String line = "";
			
			pW.printf (MAP_WIDTH + "x" + MAP_HEIGHT + "%n");
			pW.printf (TILE_SIZE + "%n");
			
			for (int i = 1; i <= tileSetsLoaded; i++) {
				pW.printf ("f:" + tileSetPath[i] + "%n");
			}
			
			for (int y = 0; y < (MAP_WIDTH); y ++){
				for (int x = 0; x < (MAP_HEIGHT); x++) {
					if (x != 0) 
						line = line + " ";
					for (int l = 0; l < MAX_LAYERS;l++) {
						line = line + map[l][x][y];
						if (l + 1 < MAX_LAYERS)
							line = line + ".";
					}
				}
				pW.printf (line + "%n");
				line = "";
			}
			pW.close ();
			
			System.out.println ("File " + fileName + " saved.");
			
		} catch (IOException e) {
			System.out.println ("Error writing to " + System.getProperty ("user.dir") + "/" + fileName);
		}
	}
	
	public void loadFile (String fileName){
		try {
			FileReader r = new FileReader (fileName);
			BufferedReader bR = new BufferedReader (r);
			
			mapName = fileName;
			Path p = Paths.get(fileName);
			Path folder = p.getParent();
			String path = folder.toString();
			System.out.println("path: " + path);
			String line = "";
			int y = -1;
			while ((line = bR.readLine ()) != null){
				if (y == -1) {
					MAP_WIDTH = Integer.parseInt (line.substring (0, line.indexOf ("x")));
					MAP_HEIGHT = Integer.parseInt (line.substring (line.indexOf ("x") + 1, line.length ()));
					y = -2;
				} else if (y == -2){
					TILE_SIZE = Integer.parseInt (line);
					y = 0;
				} else {
					if (line.substring(0,2).compareTo ("f:") == 0)
						loadTileSet (line.substring (2), path);
					else if (line.substring(0,5).compareTo ("ball:") == 0) {
						String temp = line.substring(5);
	
						//ball.setPosition(Integer.parseInt(temp.substring(0, line.indexOf("x"))), Integer.parseInt(temp.substring(line.indexOf("x") + 1)));
					} else if (line.substring(0,12).compareTo ("teamOneGoal:") == 0) {
						String temp = line.substring(12);
				
						teamOneGoal.setPosition(Integer.parseInt(temp.substring(0, line.indexOf("x"))), Integer.parseInt(temp.substring(line.indexOf("x") + 1)));
					} else if (line.substring(0,12).compareTo ("teamTwoGoal:") == 0) {
						String temp = line.substring(12);
	
						teamTwoGoal.setPosition(Integer.parseInt(temp.substring(0, line.indexOf("x"))), Integer.parseInt(temp.substring(line.indexOf("x") + 1)));
					} else {
						int step = 1, x = 0;
						for (int i = 0; i < line.length() - 1; i+=(step+1)) {
							if (line.substring(i).contains(" "))
								step = line.substring(i).indexOf(' ');
							else
								step = line.substring(i).length();
								
							// all layers in one field
							String field = line.substring (i, i+step);
							
							int fieldStep = 1, c = 0;
								
							for (int l = 0; l <= MAX_LAYERS - 1; l++){
								if (field.substring(c).contains ("."))
									fieldStep = field.substring (c).indexOf (".");
								else 
									fieldStep = field.substring (c).length ();
								
								map [l][x][y] = Integer.valueOf (field.substring (c,c+fieldStep));
								
								c += fieldStep + 1;
							}
								
							x++;
						}
						y++;
					}
				}
			
			}
			
			offsetX = 0;
			
			if (MAP_HEIGHT > (int)(WINDOW_HEIGHT / TILE_SIZE))
				offsetY = (MAP_HEIGHT - (int)(WINDOW_HEIGHT / TILE_SIZE)) * -1;
			else
				offsetY = 0;
			
			currentState = ApplicationStates.Editor;
			
			System.out.println ("File " + fileName + " (" + MAP_WIDTH + "x" + MAP_HEIGHT + ") imported.");
			
		} catch (IOException e) {
			System.out.println ("Error reading file " + System.getProperty ("user.dir") + "/" + fileName);
		}

		repaint ();
	}
}